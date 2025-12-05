# ApiService

A centralized HTTP service for making API requests throughout the OHIF application.

## Features

- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **File Operations**: Upload and Download
- **Authentication**: Automatic token handling
- **Error Handling**: Standardized error responses
- **Interceptors**: Request/Response middleware
- **TypeScript**: Full type support

## Usage

### Basic Usage

```typescript
import { apiService } from '@ohif/core';

// GET request
const response = await apiService.get('/api/users');
console.log(response.data);

// POST request
const newUser = await apiService.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updatedUser = await apiService.put('/api/users/123', {
  name: 'Jane Doe'
});

// DELETE request
await apiService.delete('/api/users/123');
```

### With Custom Base URL

```typescript
import { ApiService } from '@ohif/core';

const customApi = new ApiService('https://api.example.com');
const response = await customApi.get('/users');
```

### File Upload

```typescript
import { apiService } from '@ohif/core';

const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await apiService.upload('/api/upload', formData);
```

### File Download

```typescript
import { apiService } from '@ohif/core';

await apiService.download('/api/files/123', 'document.pdf');
```

### Error Handling

```typescript
import { apiService, type ApiError } from '@ohif/core';

try {
  const response = await apiService.get('/api/users');
  console.log(response.data);
} catch (error) {
  const apiError = error as ApiError;
  console.error(`Error ${apiError.status}: ${apiError.message}`);
}
```

### Authentication

```typescript
import { apiService } from '@ohif/core';

// Set token (automatically added to all requests)
apiService.setAuthToken('your-jwt-token');

// Clear token
apiService.clearAuthToken();
```

### Custom Headers

```typescript
import { apiService } from '@ohif/core';

apiService.setDefaultHeaders({
  'X-API-Key': 'your-api-key',
  'Accept-Language': 'en-US'
});
```

## Configuration

The service automatically:
- Sets `Content-Type: application/json` for JSON requests
- Adds `Authorization: Bearer <token>` header if token is available
- Handles timeouts (30 seconds default)
- Provides standardized error responses

## Error Response Format

```typescript
interface ApiError {
  message: string;      // Error message
  status?: number;      // HTTP status code
  data?: any;          // Additional error data
}
```

## Success Response Format

```typescript
interface ApiResponse<T> {
  data: T;             // Response data
  status: number;       // HTTP status code
  statusText: string;   // HTTP status text
  message?: string;     // Optional message
}
```
