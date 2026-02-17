import numpy as np
from scipy import stats
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


class SensorFusionAnalyzer:
    """
    Tier 1 Triage: Sensor Fusion Analysis
    Physics-First approach using Pearson Correlation between IMU and Optical Flow
    """
    
    FRAUD_THRESHOLD = 0.85  # r < 0.85 flags as fraud
    
    def calculate_pearson_correlation(
        self,
        gyro_gamma: List[float],
        optical_flow_x: List[float]
    ) -> float:
        """
        Calculate Pearson Correlation coefficient between Gyro Gamma and Optical Flow X
        
        Args:
            gyro_gamma: List of gyroscope gamma values (rotation around front-to-back axis)
            optical_flow_x: List of horizontal optical flow magnitudes
        
        Returns:
            Pearson correlation coefficient (r) in range [-1, 1]
        """
        try:
            # Ensure we have data
            if not gyro_gamma or not optical_flow_x:
                logger.error("Empty data arrays for correlation calculation")
                return 0.0
            
            # Align data lengths (use minimum length)
            min_len = min(len(gyro_gamma), len(optical_flow_x))
            gyro_gamma = gyro_gamma[:min_len]
            optical_flow_x = optical_flow_x[:min_len]
            
            # Need at least 2 points for correlation
            if min_len < 2:
                logger.error("Insufficient data points for correlation")
                return 0.0
            
            # Convert to numpy arrays
            gyro_array = np.array(gyro_gamma)
            flow_array = np.array(optical_flow_x)
            
            # Calculate Pearson correlation
            correlation, p_value = stats.pearsonr(gyro_array, flow_array)
            
            logger.info(f"Pearson correlation: r={correlation:.4f}, p={p_value:.4f}")
            
            return float(correlation)
            
        except Exception as e:
            logger.error(f"Correlation calculation failed: {e}")
            return 0.0
    
    def calculate_tier_1_score(self, r: float) -> int:
        """
        Map Pearson correlation (r) to Tier 1 Score (0-100)
        
        Mapping:
        - r >= 0.85: Score 85-100 (linear mapping)
        - r < 0.85: Score 0-84 (linear mapping)
        
        Args:
            r: Pearson correlation coefficient
        
        Returns:
            Tier 1 score (0-100)
        """
        # Clamp r to [-1, 1] range
        r = max(-1.0, min(1.0, r))
        
        if r >= self.FRAUD_THRESHOLD:
            # Pass: Map [0.85, 1.0] to [85, 100]
            score = 85 + ((r - 0.85) / 0.15) * 15
        else:
            # Fail: Map [-1.0, 0.85) to [0, 84]
            score = ((r + 1.0) / 1.85) * 84
        
        # Round to integer
        score = int(round(score))
        
        # Ensure bounds
        score = max(0, min(100, score))
        
        logger.info(f"Tier 1 score calculated: {score} (r={r:.4f})")
        
        return score
    
    def should_trigger_tier_2(self, r: float) -> bool:
        """
        Determine if Tier 2 AI forensics should be triggered
        
        Args:
            r: Pearson correlation coefficient
        
        Returns:
            True if r < 0.85 (fraud suspected)
        """
        trigger = r < self.FRAUD_THRESHOLD
        
        if trigger:
            logger.warning(f"Tier 2 triggered: r={r:.4f} < {self.FRAUD_THRESHOLD}")
        else:
            logger.info(f"Tier 2 not needed: r={r:.4f} >= {self.FRAUD_THRESHOLD}")
        
        return trigger
    
    def analyze(
        self,
        gyro_gamma: List[float],
        optical_flow_x: List[float]
    ) -> Tuple[float, int, bool]:
        """
        Complete Tier 1 analysis
        
        Args:
            gyro_gamma: List of gyroscope gamma values
            optical_flow_x: List of horizontal optical flow magnitudes
        
        Returns:
            Tuple of (correlation, tier_1_score, trigger_tier_2)
        """
        # Calculate correlation
        r = self.calculate_pearson_correlation(gyro_gamma, optical_flow_x)
        
        # Calculate Tier 1 score
        tier_1_score = self.calculate_tier_1_score(r)
        
        # Determine if Tier 2 needed
        trigger_tier_2 = self.should_trigger_tier_2(r)
        
        logger.info(
            f"Tier 1 Analysis Complete: r={r:.4f}, "
            f"score={tier_1_score}, trigger_tier_2={trigger_tier_2}"
        )
        
        return r, tier_1_score, trigger_tier_2


# Global sensor fusion analyzer instance
sensor_fusion_analyzer = SensorFusionAnalyzer()
