# Theater CRUD Test Report

## Summary
- **Total Tests**: 8
- **Passed**: 7 ✅
- **Failed**: 1 ❌
- **Success Rate**: 87.50%
- **Date**: 2025-10-13T08:51:59.254Z

## Test Details


### 1. Get Admin Token ✅
- **Status**: PASSED
- **Message**: Successfully obtained admin token
- **Time**: 2025-10-13T08:51:54.662Z



### 2. Create Theater ✅
- **Status**: PASSED
- **Message**: Theater created successfully
- **Time**: 2025-10-13T08:51:55.145Z
- **Data**: ```json
{
  "id": "68ecbdaac14b6431f9b02bb6",
  "name": "Test Theater CRUD",
  "documentsUploaded": 0
}
```


### 3. Read Theater ✅
- **Status**: PASSED
- **Message**: Theater retrieved successfully
- **Time**: 2025-10-13T08:51:57.158Z
- **Data**: ```json
{
  "id": "68ecbdaac14b6431f9b02bb6",
  "name": "Test Theater CRUD",
  "email": "test.crud@theater.com"
}
```


### 4. Update Theater ✅
- **Status**: PASSED
- **Message**: Theater updated successfully
- **Time**: 2025-10-13T08:51:57.194Z
- **Data**: ```json
{
  "id": "68ecbdaac14b6431f9b02bb6",
  "name": "Test Theater CRUD Updated",
  "email": "updated.crud@theater.com"
}
```


### 5. File Replacement Check ✅
- **Status**: PASSED
- **Message**: Files replaced successfully
- **Time**: 2025-10-13T08:51:57.194Z
- **Data**: ```json
{
  "replacedFiles": [
    "logo",
    "panCard",
    "gstCertificate"
  ]
}
```


### 6. Delete Theater (Soft) ✅
- **Status**: PASSED
- **Message**: Theater soft deleted successfully
- **Time**: 2025-10-13T08:51:59.217Z



### 7. Soft Delete Verification ✅
- **Status**: PASSED
- **Message**: Theater is deactivated
- **Time**: 2025-10-13T08:51:59.226Z



### 8. Create Theater ❌
- **Status**: FAILED
- **Message**: Request failed: Request failed with status code 409
- **Time**: 2025-10-13T08:51:59.250Z
- **Data**: ```json
{
  "success": false,
  "error": "Username already exists",
  "code": "USERNAME_EXISTS"
}
```


## Conclusion
⚠️ Some tests failed. Please review the error messages above.
