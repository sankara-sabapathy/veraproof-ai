import logging
import os
import sys
from pythonjsonlogger import jsonlogger

# OpenTelemetry 
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

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
    Initializes standard OpenTelemetry hooks configuring a global TracerProvider.
    Attempts to route to OTLP_ENDPOINT (Grafana Cloud).
    Safely degrades to standard JSON stdout if exporting fails.
    """
    try:
        # Define Service Name for Grafana
        resource = Resource.create({"service.name": app_name})
        
        # Instantiate Global Tracer Provider
        provider = TracerProvider(resource=resource)
        
        # Configure the Vendor-Agnostic OTLP Exporter (Grafana Cloud / Datadog)
        # It relies entirely on 'OTEL_EXPORTER_OTLP_ENDPOINT' & 'OTEL_EXPORTER_OTLP_HEADERS' environment variables
        export_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        
        if export_endpoint:
            # We have a telemetry backend configured! Boot OTLP batch processor.
            otlp_exporter = OTLPSpanExporter()
            processor = BatchSpanProcessor(otlp_exporter)
            provider.add_span_processor(processor)
            
        # Safely set the global tracer provider strictly to our newly instantiated configuration
        trace.set_tracer_provider(provider)

    except Exception as e:
        print(f"Failed to bootstrap OpenTelemetry: {e}", file=sys.stderr)

    # ---------------------------------------------------------
    # Overhaul root python logging to output OTel Context JSON
    # ---------------------------------------------------------
    root_logger = logging.getLogger()
    
    # Remove existing basicConfig vanilla string loggers to prevent duplicates
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)
            
    # Cap root level to INFO
    root_logger.setLevel(logging.INFO)

    log_handler = logging.StreamHandler(sys.stdout)
    
    # Define our custom JSON Formatter
    formatter = OpenTelemetryJsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    log_handler.setFormatter(formatter)
    root_logger.addHandler(log_handler)

def apply_fastapi_instrumentation(app):
    """
    Helper function automatically binding OTel tracing to every single FastAPI route.
    """
    FastAPIInstrumentor.instrument_app(app)
