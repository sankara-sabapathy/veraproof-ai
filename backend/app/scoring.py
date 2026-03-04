import logging

logger = logging.getLogger(__name__)

def calculate_unified_score(physics_score: float, ai_score: float) -> float:
    """
    Combines the real-time physics sensor correlation score with the Deep AI analysis score.
    Weights: 40% Physics, 60% AI.
    If the AI fails (ai_score < 0), the physics score is fully trusted (100% weight).
    """
    # If the AI evaluation failed or hit a quota limit, fallback entirely to physics score
    if ai_score < 0:
        logger.warning(f"AI scoring fallback triggered. Relying 100% on Tier 1 Physics Score: {physics_score}")
        return float(physics_score)
        
    # If the AI explicitly flagged it as heavily spoofed (Score < 20), immediately penalize heavily
    if ai_score < 20:
        return min(physics_score * 0.2, ai_score)
        
    # Standard weighted score
    unified_score = (physics_score * 0.4) + (ai_score * 0.6)
    return round(unified_score, 2)

def evaluate_trust_status(unified_score: float, threshold: float = 75.0) -> bool:
    """
    Returns True if the verification is deemed Authentic (passes threshold).
    """
    return unified_score >= threshold
