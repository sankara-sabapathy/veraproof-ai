import logging
import os
import sys
from pythonjsonlogger import jsonlogger

# OpenTelemetry — Tracing
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# OpenTelemetry — Logging
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter


class OpenTelemetryJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON Formatter that injects OpenTelemetry trace context
    into standard Python logs seamlessly.
    """
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Extract active OTel trace spans
        current_span = trace.get_current_span()
        if current_span and current_span.is_recording():
            ctx = current_span.get_span_context()

            # Format according to w3c trace context standards so Grafana/Datadog parse it natively
            log_record['trace_id'] = format(ctx.trace_id, '032x')
            log_record['span_id'] = format(ctx.span_id, '016x')


def setup_telemetry(app_name: str = "veraproof-backend"):
    """
    Initializes OpenTelemetry Tracing AND Logging exporters.
    Routes both signals to OTLP_ENDPOINT (Grafana Cloud) when configured.
    Safely degrades to standard JSON stdout if exporting fails.
    """
    app_name = os.getenv("OTEL_SERVICE_NAME", app_name)
    environment = os.getenv("ENVIRONMENT", "development")

    # Define required Resource attributes for Grafana Cloud
    resource = Resource.create({
        "service.name": app_name,
        "service.namespace": "veraproof",
        "deployment.environment": environment
    })

    export_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    # ---------------------------------------------------------
    # 1. Configure Tracing
    # ---------------------------------------------------------
    try:
        provider = TracerProvider(resource=resource)

        if export_endpoint:
            otlp_trace_exporter = OTLPSpanExporter()
            provider.add_span_processor(BatchSpanProcessor(otlp_trace_exporter))

        trace.set_tracer_provider(provider)
    except Exception as e:
        print(f"Failed to bootstrap OpenTelemetry Tracing: {e}", file=sys.stderr)

    # ---------------------------------------------------------
    # 2. Configure Log Export (OTLP → Grafana Cloud Loki)
    # ---------------------------------------------------------
    otel_log_handler = None
    try:
        if export_endpoint:
            logger_provider = LoggerProvider(resource=resource)
            otlp_log_exporter = OTLPLogExporter()
            logger_provider.add_log_record_processor(
                BatchLogRecordProcessor(otlp_log_exporter)
            )
            set_logger_provider(logger_provider)

            # Create a logging.Handler that bridges Python logs → OTel LogRecords
            otel_log_handler = LoggingHandler(
                level=logging.INFO,
                logger_provider=logger_provider
            )
    except Exception as e:
        print(f"Failed to bootstrap OpenTelemetry Log Export: {e}", file=sys.stderr)

    # ---------------------------------------------------------
    # 3. Configure Python root logger with JSON + OTel context
    # ---------------------------------------------------------
    root_logger = logging.getLogger()

    # Remove existing handlers to prevent duplicates
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)

    root_logger.setLevel(logging.INFO)

    # Primary handler: JSON-formatted stdout (always active)
    stdout_handler = logging.StreamHandler(sys.stdout)
    formatter = OpenTelemetryJsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    stdout_handler.setFormatter(formatter)
    root_logger.addHandler(stdout_handler)

    # Secondary handler: OTLP log export (only when endpoint is configured)
    if otel_log_handler:
        root_logger.addHandler(otel_log_handler)
        # Use stdout to avoid circular logging
        print(
            f"[telemetry] OTLP Log Export enabled → {export_endpoint}",
            file=sys.stdout
        )


def apply_fastapi_instrumentation(app):
    """
    Helper function automatically binding OTel tracing to every single FastAPI route.
    """
    FastAPIInstrumentor.instrument_app(app)
