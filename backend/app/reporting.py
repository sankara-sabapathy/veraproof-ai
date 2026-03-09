import hashlib
import json
import textwrap
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List, Optional
from zipfile import ZIP_DEFLATED, ZipFile

from app.artifact_manager import artifact_manager
from app.storage import storage_manager


class VerificationEvidenceManager:
    async def generate_report(self, session: Dict) -> Dict:
        tenant_id = str(session['tenant_id'])
        artifacts = await artifact_manager.list_artifacts(session['session_id'], tenant_id=tenant_id)
        artifact_map = {artifact['artifact_type']: artifact for artifact in artifacts}

        imu_payload = await self._load_json_if_present(artifact_map.get('imu_telemetry'))
        rekognition_payload = await self._load_json_if_present(artifact_map.get('rekognition_raw'))

        report_lines = self._build_report_lines(session, artifacts, imu_payload, rekognition_payload)
        pdf_bytes = self._render_pdf(report_lines)
        storage_key = await storage_manager.store_session_artifact(
            tenant_id=session['tenant_id'],
            session_id=session['session_id'],
            filename='verification_report.pdf',
            artifact_data=pdf_bytes,
            content_type='application/pdf',
        )
        encryption_metadata = await storage_manager.get_object_metadata(storage_key)

        return await artifact_manager.upsert_artifact(
            session_id=session['session_id'],
            tenant_id=tenant_id,
            artifact_type='verification_report_pdf',
            provider='veraproof_ai',
            file_name='verification_report.pdf',
            content_type='application/pdf',
            storage_key=storage_key,
            size_bytes=len(pdf_bytes),
            sha256=hashlib.sha256(pdf_bytes).hexdigest(),
            metadata={
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'source_artifact_types': sorted(artifact_map.keys()),
            },
            encryption_mode=encryption_metadata.get('vp_mode'),
            encryption_key_id=encryption_metadata.get('vp_key_id'),
        )

    async def generate_bundle(self, session: Dict) -> Dict:
        tenant_id = str(session['tenant_id'])
        report_artifact = await self.generate_report(session)
        artifacts = await artifact_manager.list_artifacts(session['session_id'], tenant_id=tenant_id)
        artifact_map = {artifact['artifact_type']: artifact for artifact in artifacts}
        artifact_map['verification_report_pdf'] = report_artifact

        bundle_entries = []
        for artifact_type in ('verification_report_pdf', 'original_video', 'imu_telemetry', 'rekognition_raw'):
            artifact = artifact_map.get(artifact_type)
            if not artifact:
                continue
            artifact_bytes = await storage_manager.load_artifact_bytes(artifact['storage_key'])
            bundle_entries.append((artifact['file_name'], artifact_bytes, artifact))

        manifest = {
            'session_id': str(session['session_id']),
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'artifacts': [
                {
                    'artifact_type': artifact['artifact_type'],
                    'file_name': artifact['file_name'],
                    'content_type': artifact['content_type'],
                    'sha256': artifact.get('sha256'),
                }
                for _, _, artifact in bundle_entries
            ],
        }

        zip_buffer = BytesIO()
        with ZipFile(zip_buffer, 'w', compression=ZIP_DEFLATED) as bundle:
            for file_name, artifact_bytes, _artifact in bundle_entries:
                bundle.writestr(file_name, artifact_bytes)
            bundle.writestr('manifest.json', json.dumps(manifest, indent=2))

        zip_bytes = zip_buffer.getvalue()
        storage_key = await storage_manager.store_session_artifact(
            tenant_id=session['tenant_id'],
            session_id=session['session_id'],
            filename='verification_artifacts_bundle.zip',
            artifact_data=zip_bytes,
            content_type='application/zip',
        )
        encryption_metadata = await storage_manager.get_object_metadata(storage_key)

        return await artifact_manager.upsert_artifact(
            session_id=session['session_id'],
            tenant_id=tenant_id,
            artifact_type='artifact_bundle_zip',
            provider='veraproof_ai',
            file_name='verification_artifacts_bundle.zip',
            content_type='application/zip',
            storage_key=storage_key,
            size_bytes=len(zip_bytes),
            sha256=hashlib.sha256(zip_bytes).hexdigest(),
            metadata={
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'included_artifact_types': [artifact['artifact_type'] for _, _, artifact in bundle_entries],
            },
            encryption_mode=encryption_metadata.get('vp_mode'),
            encryption_key_id=encryption_metadata.get('vp_key_id'),
        )

    async def _load_json_if_present(self, artifact: Optional[Dict]):
        if not artifact:
            return None
        return await storage_manager.load_json_artifact(artifact['storage_key'])

    def _build_report_lines(self, session: Dict, artifacts: List[Dict], imu_payload, rekognition_payload) -> List[str]:
        lines: List[str] = []

        def add_heading(text: str):
            lines.append('')
            lines.append(text.upper())
            lines.append('=' * len(text))

        def add_json_block(label: str, payload):
            add_heading(label)
            if payload is None:
                lines.append('Not available')
                return
            for raw_line in json.dumps(payload, indent=2, default=str).splitlines():
                wrapped = textwrap.wrap(raw_line, width=100, replace_whitespace=False, drop_whitespace=False) or ['']
                lines.extend(wrapped)

        lines.append('VeraProof AI Certified Verification Report')
        lines.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
        lines.append(f"Session ID: {session.get('session_id')}")
        lines.append(f"Tenant ID: {session.get('tenant_id')}")
        lines.append(f"Verification Status: {session.get('verification_status') or session.get('state') or 'unknown'}")
        lines.append(f"Final Trust Score: {session.get('final_trust_score')}")
        lines.append(f"Tier 1 Score: {session.get('tier_1_score')}")
        lines.append(f"Tier 2 Score: {session.get('tier_2_score')}")
        lines.append(f"AI Score: {session.get('ai_score')}")
        lines.append(f"Physics Score: {session.get('physics_score')}")
        lines.append(f"Correlation Value: {session.get('correlation_value')}")
        lines.append(f"Reasoning: {session.get('reasoning') or 'N/A'}")

        add_heading('Artifact Inventory')
        if artifacts:
            for artifact in artifacts:
                lines.append(
                    f"- {artifact['artifact_type']}: {artifact['file_name']} ({artifact['content_type']}) sha256={artifact.get('sha256') or 'n/a'}"
                )
        else:
            lines.append('No artifacts registered')

        add_json_block('Session Metadata', session.get('metadata') or {})
        add_json_block('AI Explanation', session.get('ai_explanation') or {})
        add_json_block('Rekognition Raw Output', rekognition_payload)
        add_json_block('IMU Telemetry', imu_payload)
        return lines

    def _render_pdf(self, lines: List[str]) -> bytes:
        wrapped_lines: List[str] = []
        for line in lines:
            if not line:
                wrapped_lines.append('')
                continue
            wrapped_lines.extend(textwrap.wrap(line, width=100, replace_whitespace=False, drop_whitespace=False) or [''])

        lines_per_page = 48
        pages = [wrapped_lines[i:i + lines_per_page] for i in range(0, len(wrapped_lines), lines_per_page)] or [[]]
        objects: List[bytes] = []

        def add_object(payload: str | bytes) -> int:
            data = payload.encode('latin-1') if isinstance(payload, str) else payload
            objects.append(data)
            return len(objects)

        font_id = add_object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
        page_ids: List[int] = []
        content_ids: List[int] = []

        for page_lines in pages:
            commands = ['BT', '/F1 10 Tf', '14 TL', '40 760 Td']
            for line in page_lines:
                escaped = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
                commands.append(f'({escaped}) Tj')
                commands.append('T*')
            commands.append('ET')
            stream = '\n'.join(commands).encode('latin-1', errors='replace')
            content_id = add_object(b'<< /Length ' + str(len(stream)).encode('ascii') + b' >>\nstream\n' + stream + b'\nendstream')
            content_ids.append(content_id)
            page_id = add_object('')
            page_ids.append(page_id)

        pages_kids = ' '.join(f'{page_id} 0 R' for page_id in page_ids)
        pages_id = add_object(f'<< /Type /Pages /Kids [{pages_kids}] /Count {len(page_ids)} >>')
        catalog_id = add_object(f'<< /Type /Catalog /Pages {pages_id} 0 R >>')

        for page_id, content_id in zip(page_ids, content_ids):
            objects[page_id - 1] = (
                f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] '
                f'/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>'
            ).encode('latin-1')

        output = BytesIO()
        output.write(b'%PDF-1.4\n')
        offsets = [0]
        for index, obj in enumerate(objects, start=1):
            offsets.append(output.tell())
            output.write(f'{index} 0 obj\n'.encode('ascii'))
            output.write(obj)
            output.write(b'\nendobj\n')

        xref_offset = output.tell()
        output.write(f'xref\n0 {len(objects) + 1}\n'.encode('ascii'))
        output.write(b'0000000000 65535 f \n')
        for offset in offsets[1:]:
            output.write(f'{offset:010d} 00000 n \n'.encode('ascii'))
        output.write((f'trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_offset}\n%%EOF').encode('ascii'))
        return output.getvalue()


evidence_manager = VerificationEvidenceManager()
