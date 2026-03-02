import logging

logger = logging.getLogger(__name__)

def calculate_unified_score(physics_score: float, ai_score: float) -> float:
    """
    Combines the real-time physics sensor correlation score with the Deep AI analysis score.
    Weights: 40% Physics, 60% AI.
    """
    # E.g. physics_score is a percentage (0-100)
    # ai_score is a percentage (0-100)
    
    # If the AI explicitly flagged it as heavily spoofed (Score < 20), immediately penalize heavily
    if ai_score < 20:
        return min(physics_score * 0.2, ai_score)
        
    unified_score = (physics_score * 0.4) + (ai_score * 0.6)
    return round(unified_score, 2)

def evaluate_trust_status(unified_score: float, threshold: float = 75.0) -> bool:
    """
    Returns True if the verification is deemed Authentic (passes threshold).
    """
    return unified_score >= threshold
