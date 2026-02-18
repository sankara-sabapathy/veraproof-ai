"""
Sensor Fusion Tests - Unit and Property-Based
"""
import pytest
import numpy as np
from hypothesis import given, strategies as st, settings, assume
from app.sensor_fusion import sensor_fusion_analyzer
from app.optical_flow import optical_flow_engine


class TestSensorFusion:
    """Unit tests for sensor fusion"""
    
    def test_pearson_correlation_perfect_positive(self):
        """Test Pearson correlation with perfect positive correlation"""
        gyro_data = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        flow_data = np.array([2.0, 4.0, 6.0, 8.0, 10.0])
        
        correlation = sensor_fusion_analyzer.calculate_pearson_correlation(
            gyro_data,
            flow_data
        )
        
        assert abs(correlation - 1.0) < 0.001
    
    def test_pearson_correlation_perfect_negative(self):
        """Test Pearson correlation with perfect negative correlation"""
        gyro_data = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        flow_data = np.array([10.0, 8.0, 6.0, 4.0, 2.0])
        
        correlation = sensor_fusion_analyzer.calculate_pearson_correlation(
            gyro_data,
            flow_data
        )
        
        assert abs(correlation - (-1.0)) < 0.001
    
    def test_pearson_correlation_no_correlation(self):
        """Test Pearson correlation with no correlation"""
        gyro_data = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        flow_data = np.array([5.0, 3.0, 1.0, 4.0, 2.0])
        
        correlation = sensor_fusion_analyzer.calculate_pearson_correlation(
            gyro_data,
            flow_data
        )
        
        # Should be close to 0
        assert abs(correlation) < 0.5
    
    def test_tier_1_score_high_correlation(self):
        """Test Tier 1 score calculation with high correlation"""
        correlation = 0.95
        score = sensor_fusion_analyzer.calculate_tier_1_score(correlation)
        
        assert 90 <= score <= 100
    
    def test_tier_1_score_low_correlation(self):
        """Test Tier 1 score calculation with low correlation"""
        correlation = 0.3
        score = sensor_fusion_analyzer.calculate_tier_1_score(correlation)
        
        assert 0 <= score < 50
    
    def test_should_trigger_tier_2_below_threshold(self):
        """Test Tier 2 triggering below threshold"""
        correlation = 0.80
        should_trigger = sensor_fusion_analyzer.should_trigger_tier_2(correlation)
        
        assert should_trigger is True
    
    def test_should_trigger_tier_2_above_threshold(self):
        """Test Tier 2 not triggering above threshold"""
        correlation = 0.90
        should_trigger = sensor_fusion_analyzer.should_trigger_tier_2(correlation)
        
        assert should_trigger is False


class TestPropertyBasedSensorFusion:
    """Property-based tests for sensor fusion"""
    
    @given(
        size=st.integers(min_value=10, max_value=100),
        scale=st.floats(min_value=0.1, max_value=10.0)
    )
    @settings(max_examples=50, deadline=None)
    def test_property_pearson_correlation_range(self, size, scale):
        """Property 7: Pearson correlation is always between -1 and 1"""
        # Generate random data
        gyro_data = np.random.randn(size) * scale
        flow_data = np.random.randn(size) * scale
        
        # Ensure not constant (would cause division by zero)
        assume(np.std(gyro_data) > 0.001)
        assume(np.std(flow_data) > 0.001)
        
        correlation = sensor_fusion_analyzer.calculate_pearson_correlation(
            gyro_data,
            flow_data
        )
        
        # Correlation must be in [-1, 1]
        assert -1.0 <= correlation <= 1.0
    
    @given(correlation=st.floats(min_value=-1.0, max_value=1.0))
    @settings(max_examples=100, deadline=None)
    def test_property_tier_1_score_range(self, correlation):
        """Property 9: Tier 1 score is always 0-100"""
        score = sensor_fusion_analyzer.calculate_tier_1_score(correlation)
        
        # Score must be in [0, 100]
        assert 0 <= score <= 100
    
    @given(correlation=st.floats(min_value=-1.0, max_value=1.0))
    @settings(max_examples=100, deadline=None)
    def test_property_tier_1_score_mapping(self, correlation):
        """Property 10: Tier 1 score boundaries are correct"""
        score = sensor_fusion_analyzer.calculate_tier_1_score(correlation)
        
        # High correlation (>= 0.85) should give high score (>= 85)
        if correlation >= 0.85:
            assert score >= 85
        
        # Low correlation (< 0.5) should give low score (< 50)
        if correlation < 0.5:
            assert score < 50
    
    @given(correlation=st.floats(min_value=-1.0, max_value=1.0))
    @settings(max_examples=100, deadline=None)
    def test_property_correlation_threshold_classification(self, correlation):
        """Property 8: Correlation threshold classification is correct"""
        should_trigger = sensor_fusion_analyzer.should_trigger_tier_2(correlation)
        
        # Below threshold (< 0.85) should trigger Tier 2
        if correlation < 0.85:
            assert should_trigger is True
        else:
            assert should_trigger is False
    
    @given(
        size=st.integers(min_value=10, max_value=50),
        noise_level=st.floats(min_value=0.0, max_value=0.5)
    )
    @settings(max_examples=30, deadline=None)
    def test_property_correlation_symmetry(self, size, noise_level):
        """Property: Correlation is symmetric"""
        # Generate correlated data
        base_data = np.random.randn(size)
        gyro_data = base_data + np.random.randn(size) * noise_level
        flow_data = base_data + np.random.randn(size) * noise_level
        
        # Ensure not constant
        assume(np.std(gyro_data) > 0.001)
        assume(np.std(flow_data) > 0.001)
        
        corr1 = sensor_fusion_analyzer.calculate_pearson_correlation(gyro_data, flow_data)
        corr2 = sensor_fusion_analyzer.calculate_pearson_correlation(flow_data, gyro_data)
        
        # Correlation should be symmetric
        assert abs(corr1 - corr2) < 0.001


class TestOpticalFlow:
    """Unit tests for optical flow"""
    
    def test_optical_flow_computation(self):
        """Test optical flow computation with synthetic frames"""
        # Create two simple frames (shifted pattern)
        frame1 = np.zeros((100, 100), dtype=np.uint8)
        frame2 = np.zeros((100, 100), dtype=np.uint8)
        
        # Add a moving pattern
        frame1[40:60, 40:60] = 255
        frame2[40:60, 45:65] = 255  # Shifted right by 5 pixels
        
        flow_x, flow_y = optical_flow_engine.compute_flow(frame1, frame2)
        
        # Flow should be detected
        assert flow_x is not None
        assert flow_y is not None
        assert isinstance(flow_x, (int, float))
        assert isinstance(flow_y, (int, float))
    
    def test_optical_flow_no_motion(self):
        """Test optical flow with no motion"""
        # Same frame twice
        frame = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        
        flow_x, flow_y = optical_flow_engine.compute_flow(frame, frame)
        
        # Should detect minimal flow
        assert abs(flow_x) < 1.0
        assert abs(flow_y) < 1.0


class TestPropertyBasedOpticalFlow:
    """Property-based tests for optical flow"""
    
    @given(
        size=st.integers(min_value=50, max_value=200),
        shift=st.integers(min_value=-10, max_value=10)
    )
    @settings(max_examples=30, deadline=None)
    def test_property_optical_flow_detects_horizontal_motion(self, size, shift):
        """Property 6: Optical flow detects horizontal motion"""
        assume(shift != 0)  # Need actual motion
        
        # Create frames with horizontal shift
        frame1 = np.zeros((size, size), dtype=np.uint8)
        frame2 = np.zeros((size, size), dtype=np.uint8)
        
        # Add pattern
        center = size // 2
        pattern_size = size // 4
        frame1[center-pattern_size:center+pattern_size, 
               center-pattern_size:center+pattern_size] = 255
        
        # Shift pattern horizontally
        new_center = center + shift
        if 0 < new_center - pattern_size and new_center + pattern_size < size:
            frame2[center-pattern_size:center+pattern_size,
                   new_center-pattern_size:new_center+pattern_size] = 255
            
            flow_x, flow_y = optical_flow_engine.compute_flow(frame1, frame2)
            
            # Flow direction should match shift direction
            if shift > 0:
                assert flow_x > 0
            else:
                assert flow_x < 0
