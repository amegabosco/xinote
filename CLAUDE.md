# Claude Code Instructions for Xinote Project

## Auto-save Context Every 4 Actions

When working on this project, please:

1. **Track Actions**: Keep an internal counter of significant actions performed (file edits, code generation, debugging, etc.)

2. **Save Context Every 4 Actions**: After every 4th action, automatically save the current project state by creating a timestamped context file in `programming_history/` folder with:
   - Current date/time
   - Recent changes made
   - Current working focus
   - Any pending tasks or issues
   - State of key services (transcription, sync, etc.)

3. **Context File Format**: Save as `programming_history/auto_context_YYYY-MM-DD_HH-MM.md`

4. **What Counts as an Action**:
   - File creation or modification
   - Running tests or debugging
   - Implementing new features
   - Fixing bugs
   - Refactoring code
   - Updating documentation

5. **Context Should Include**:
   - Summary of last 4 actions performed
   - Current feature being worked on
   - Any errors or issues encountered
   - Next steps planned

This ensures project continuity across Claude sessions and maintains a detailed development history.

## Project-Specific Context

- **Audio Format**: M4A (changed from AAC for Whisper compatibility)
- **Target Device**: Samsung Galaxy S10+ 
- **Package Name**: com.yao.xinote
- **Known Issues**: Transcription service not initializing on physical device
- **Backend**: n8n webhook at https://n8n.app.n8ne/webhook-test/xinote-webhook

## Biometric Security Implementation

### Security Strategy
- **Default State**: Biometric NOT enabled by default, but strongly recommended at first launch
- **User Choice**: Respects user decision but provides periodic reminders (every 7 days)
- **Degraded Mode**: App remains functional without biometric but with visual warnings and limited features
- **GDPR Compliance**: Security is documented and recommended but not forced

### Implementation Details
- **Package**: local_auth ^2.2.0 for biometric authentication
- **Secure Storage**: flutter_secure_storage for encrypted sensitive data
- **Restricted Features Without Biometric**:
  - Data export functionality
  - Cloud synchronization
  - Bulk operations on patient records
  - API access for third-party integrations
  - Sharing of medical recordings

### Security Indicators
- **Visual Feedback**: Orange warning banner when biometric is disabled
- **Security Badge**: Green lock (secured) or orange open lock (unsecured)
- **Audit Logging**: All sensitive actions logged with timestamp and auth status
- **Session Management**: Auto-lock after 30 seconds of inactivity when biometric is enabled

### Medical Context Requirements
- **Data Protection**: All patient audio recordings and transcriptions are encrypted
- **Access Control**: Biometric required for accessing patient records when enabled
- **Emergency Override**: PIN code fallback for emergency situations
- **Multi-practitioner**: Support for multiple doctor profiles with individual security