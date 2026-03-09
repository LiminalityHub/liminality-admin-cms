const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('admin_access_token');
  const headers = {
    ...jsonHeaders,
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const body = await parseBody(response);

  if (!response.ok) {
    const error = new Error(body?.message || 'Request failed');
    error.status = response.status;
    error.payload = body;
    throw error;
  }

  return body;
}

export async function loginRequest(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutRequest() {
  try {
    return await apiRequest('/auth/logout', { method: 'POST' });
  } catch {
    return null;
  }
}

export async function fetchPosts() {
  return apiRequest('/posts');
}

export async function fetchPostById(id) {
  return apiRequest(`/posts/${id}`);
}

export async function createPost(payload) {
  return apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePost(id, payload) {
  return apiRequest(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePost(id) {
  return apiRequest(`/posts/${id}`, {
    method: 'DELETE',
  });
}
