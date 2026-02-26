# Requirements Document

## Introduction

This specification defines the architectural refactor of VeraProof AI from a "physics-first" approach to an "AI-first with physics" approach for the AWS 10,000 AI Ideas competition. The refactor repositions AI models as the primary verification mechanism while maintaining sensor fusion as a complementary validation layer. This change emphasizes AI innovation while preserving the platform's sub-3-second latency requirement and multi-tenant capabilities.

## Glossary

- **AI_Engine**: The primary deepfake detection system using Amazon SageMaker models
- **Physics_Validator**: The sensor fusion system (IMU + Optical Flow) that provides supporting evidence
- **Trust_Score_Calculator**: Component that combines AI and physics results into a unified trust score
- **Verification_Session**: A single fraud detection session from start to completion
- **Partner**: A B2B customer using the VeraProof API
- **Tier_System**: The two-stage verification architecture (now AI-first, then physics validation)
- **Correlation_Coefficient**: Pearson r value measuring IMU-optical flow alignment
- **Challenge_Protocol**: The "Pan & Return" user interaction sequence
- **Multi_Tenant_System**: Architecture supporting isolated data and quotas per partner

## Requirements

### Requirement 1: AI-First Verification Priority

**User Story:** As a competition judge for AWS 10,000 AI Ideas, I want to see AI models as the primary verification mechanism, so that the platform demonstrates clear AI innovation.

#### Acceptance Criteria

1. WHEN a Verification_Session begins, THE AI_Engine SHALL process video frames as the primary analysis mechanism
2. THE AI_Engine SHALL generate a confidence score between 0 and 100 within 3 seconds
3. THE Trust_Score_Calculator SHALL weight AI results at 70% and physics results at 30% in the final score
4. THE AI_Engine SHALL use Amazon SageMaker endpoints for deepfake detection
5. WHEN AI analysis completes, THE Physics_Validator SHALL execute as a secondary validation layer

### Requirement 2: Physics as Complementary Validation

**User Story:** As a fraud detection engineer, I want sensor fusion to validate AI results, so that the system has multiple verification signals.

#### Acceptance Criteria

1. THE Physics_Validator SHALL calculate the Correlation_Coefficient between IMU and optical flow data
2. WHEN the Correlation_Coefficient is below 0.85, THE Physics_Validator SHALL flag potential fraud
3. THE Physics_Validator SHALL contribute 30% weight to the final Trust Score
4. THE Trust_Score_Calculator SHALL combine AI confidence and physics correlation into a unified score
5. WHEN physics validation contradicts AI results (high AI confidence but low correlation), THE Trust_Score_Calculator SHALL reduce the final score by 15-25 points

### Requirement 3: Unified Trust Score Calculation

**User Story:** As a Partner, I want a single trust score that combines AI and physics signals, so that I can make informed fraud decisions.

#### Acceptance Criteria

1. THE Trust_Score_Calculator SHALL compute Final_Trust_Score = (0.7 × AI_Confidence) + (0.3 × Physics_Score)
2. THE Trust_Score_Calculator SHALL map Correlation_Coefficient to Physics_Score using: r ≥ 0.85 → 85-100, r < 0.85 → 0-84
3. THE Trust_Score_Calculator SHALL include reasoning text explaining the score breakdown
4. THE Trust_Score_Calculator SHALL flag sessions where AI and physics signals diverge by more than 30 points
5. THE Trust_Score_Calculator SHALL return scores in the range [0, 100]

### Requirement 4: Sub-3-Second Latency Preservation

**User Story:** As a Partner integrating VeraProof into my checkout flow, I want verification results within 3 seconds, so that user experience remains smooth.

#### Acceptance Criteria

1. THE AI_Engine SHALL complete primary analysis within 2.5 seconds of Challenge_Protocol completion
2. THE Physics_Validator SHALL complete analysis within 0.5 seconds after AI_Engine completes
3. THE Verification_Session SHALL return results within 3 seconds total
4. WHEN processing exceeds 2.5 seconds, THE Verification_Session SHALL log a latency warning
5. WHEN processing exceeds 3 seconds, THE Verification_Session SHALL timeout and return an error

### Requirement 5: Parallel Processing Architecture

**User Story:** As a system architect, I want AI and physics processing to run in parallel when possible, so that latency is minimized.

#### Acceptance Criteria

1. WHEN video chunks arrive, THE AI_Engine SHALL begin processing immediately
2. WHEN IMU data arrives, THE Physics_Validator SHALL begin optical flow computation in parallel with AI processing
3. THE Trust_Score_Calculator SHALL wait for both AI_Engine and Physics_Validator to complete before computing the final score
4. WHEN either component fails, THE Trust_Score_Calculator SHALL compute a score using only the successful component
5. THE Verification_Session SHALL track processing time for AI and physics components separately

### Requirement 6: Branding and Messaging Update

**User Story:** As a marketing stakeholder, I want all documentation and UI to reflect "AI-first with physics" positioning, so that the platform aligns with AWS competition criteria.

#### Acceptance Criteria

1. THE Verification_Interface SHALL display "AI-Powered Verification" messaging during analysis
2. THE Partner_Dashboard SHALL show "AI Confidence" as the primary metric with "Physics Validation" as secondary
3. THE API_Documentation SHALL describe the platform as "AI-first with physics validation"
4. THE Verification_Interface SHALL NOT use "physics-first" terminology in any user-facing text
5. THE Partner_Dashboard SHALL display AI processing time and physics processing time separately in session details

### Requirement 7: Enhanced AI Model Integration

**User Story:** As a machine learning engineer, I want the AI_Engine to support multiple deepfake detection models, so that detection accuracy improves over time.

#### Acceptance Criteria

1. THE AI_Engine SHALL support configurable SageMaker endpoint URLs per Partner
2. THE AI_Engine SHALL detect diffusion artifacts, GAN ghosting, and temporal inconsistencies
3. WHEN multiple AI models are configured, THE AI_Engine SHALL ensemble their results using weighted averaging
4. THE AI_Engine SHALL return confidence scores with model-specific breakdowns
5. THE AI_Engine SHALL log model inference time for performance monitoring

### Requirement 8: Physics Validation Transparency

**User Story:** As a Partner reviewing verification results, I want to see detailed physics validation data, so that I understand why a session was flagged.

#### Acceptance Criteria

1. THE Physics_Validator SHALL return Correlation_Coefficient, gyro data, and optical flow data in session results
2. THE Partner_Dashboard SHALL display a correlation graph showing IMU vs optical flow alignment
3. THE API_Response SHALL include physics_validation object with correlation, threshold, and pass/fail status
4. THE Partner_Dashboard SHALL show physics validation as "Supporting Evidence" rather than primary verification
5. WHEN physics validation fails but AI confidence is high, THE API_Response SHALL include an explanation of the divergence

### Requirement 9: Backward Compatibility

**User Story:** As an existing Partner, I want my current API integration to continue working, so that I don't need to redeploy my application.

#### Acceptance Criteria

1. THE API_Endpoints SHALL maintain the same request/response structure as the current implementation
2. THE API_Response SHALL include both legacy field names (tier_1_score, tier_2_score) and new field names (ai_confidence, physics_score)
3. THE Webhook_Payload SHALL include both legacy and new field names for 90 days after deployment
4. THE API_Documentation SHALL mark legacy fields as deprecated with migration guidance
5. THE Partner_Dashboard SHALL display a migration notice for Partners using legacy field names

### Requirement 10: AI Model Fallback Strategy

**User Story:** As a reliability engineer, I want the system to gracefully handle AI model failures, so that verification sessions don't fail completely.

#### Acceptance Criteria

1. WHEN the AI_Engine fails to respond within 2.5 seconds, THE Trust_Score_Calculator SHALL compute a score using only Physics_Validator results
2. WHEN the AI_Engine returns an error, THE Verification_Session SHALL log the error and continue with physics-only verification
3. THE Trust_Score_Calculator SHALL set AI_Confidence to 50 (neutral) when AI_Engine fails
4. THE API_Response SHALL include a fallback_mode flag indicating physics-only verification was used
5. THE Partner_Dashboard SHALL display AI model availability metrics per Partner

### Requirement 11: Enhanced Analytics for AI Performance

**User Story:** As a Partner, I want to see AI model performance metrics, so that I can understand verification quality.

#### Acceptance Criteria

1. THE Partner_Dashboard SHALL display average AI confidence scores over time
2. THE Partner_Dashboard SHALL show AI-physics divergence rate (sessions where signals differ by >30 points)
3. THE Analytics_API SHALL return AI model inference time percentiles (p50, p95, p99)
4. THE Partner_Dashboard SHALL display AI model version and last update timestamp
5. THE Analytics_API SHALL support filtering by AI confidence ranges (0-50, 51-75, 76-100)

### Requirement 12: Multi-Tenant AI Model Configuration

**User Story:** As an Enterprise Partner, I want to configure custom AI models for my tenant, so that I can use domain-specific deepfake detection.

#### Acceptance Criteria

1. THE Multi_Tenant_System SHALL support per-tenant SageMaker endpoint configuration
2. THE Partner_Dashboard SHALL allow Enterprise Partners to register custom SageMaker endpoints
3. THE AI_Engine SHALL validate endpoint accessibility before saving configuration
4. THE Multi_Tenant_System SHALL enforce tenant isolation for custom AI model results
5. WHEN a custom endpoint is configured, THE AI_Engine SHALL use it instead of the default model

### Requirement 13: Challenge Protocol Preservation

**User Story:** As a user completing verification, I want the same "Pan & Return" interaction, so that the user experience remains consistent.

#### Acceptance Criteria

1. THE Challenge_Protocol SHALL maintain the baseline → pan → return sequence
2. THE Verification_Interface SHALL continue collecting IMU data at 60Hz during the challenge
3. THE Verification_Interface SHALL continue streaming video at 250ms chunks during the challenge
4. THE Challenge_Protocol SHALL complete within 5-7 seconds (1s baseline + 2-3s pan + 2-3s return)
5. THE Verification_Interface SHALL display AI-focused messaging during the challenge ("AI is analyzing your video")

### Requirement 14: Cost Optimization for AI-First Approach

**User Story:** As a platform operator, I want to optimize SageMaker costs, so that the AI-first approach remains economically viable.

#### Acceptance Criteria

1. THE AI_Engine SHALL use SageMaker Serverless Inference for variable workloads
2. THE AI_Engine SHALL batch process video frames when latency allows (target: 5-10 frames per batch)
3. THE Multi_Tenant_System SHALL track SageMaker inference costs per Partner
4. THE Billing_Manager SHALL include AI processing costs in Partner invoices for Enterprise tier
5. WHEN monthly AI costs exceed budget thresholds, THE AI_Engine SHALL send alerts to platform operators

### Requirement 15: Testing and Validation

**User Story:** As a QA engineer, I want comprehensive tests for the AI-first architecture, so that I can verify correctness.

#### Acceptance Criteria

1. THE Test_Suite SHALL include property tests verifying Trust_Score_Calculator weighting (70% AI, 30% physics)
2. THE Test_Suite SHALL include tests for AI-physics divergence detection (>30 point difference)
3. THE Test_Suite SHALL include latency tests ensuring sub-3-second completion
4. THE Test_Suite SHALL include fallback tests simulating AI_Engine failures
5. THE Test_Suite SHALL include round-trip tests for API backward compatibility (legacy field names)

