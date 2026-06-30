export const ENDPOINTS = [
  // Transactions
  { label: 'List Transactions', method: 'GET', path: '/api/v3/transactions', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },
  { label: 'Get Transaction', method: 'GET', path: '/api/v3/transactions/{uuid}', params: [] },
  { label: 'Get Transaction Documents', method: 'GET', path: '/api/v3/transactions/{uuid}/documents', params: [] },
  { label: 'Get Extracted Documents', method: 'GET', path: '/api/v3/transactions/{uuid}/extracted-documents', params: [] },

  // Cards
  { label: 'List Cards', method: 'GET', path: '/api/v3/cards', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },
  { label: 'Create Card', method: 'POST', path: '/api/v3/cards', params: [], body: '{\n  "userId": "",\n  "alias": ""\n}' },
  { label: 'Lock Card', method: 'PATCH', path: '/api/v3/cards/{uuid}/lock', params: [], body: '{\n  "locked": true\n}' },

  // Users
  { label: 'List Users', method: 'GET', path: '/api/v3/users', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },
  { label: 'Create User (v2)', method: 'POST', path: '/api/v2/users', params: [], body: '{\n  "email": "",\n  "firstName": "",\n  "lastName": ""\n}' },

  // Billing Statements
  { label: 'List Billing Statements', method: 'GET', path: '/api/v3/billing-statements', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },
  { label: 'Billing Statement Transactions', method: 'GET', path: '/api/v3/billing-statements/{uuid}/transactions', params: [] },

  // Digital Account (Brasil)
  { label: 'List Digital Accounts', method: 'GET', path: '/api/v3/digital-accounts', params: [] },

  // Reimbursements
  { label: 'List Reimbursements', method: 'GET', path: '/api/v3/reimbursements', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },

  // Invoices
  { label: 'List Invoices (v3)', method: 'GET', path: '/api/v3/invoices', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },
  { label: 'List Invoices (v2)', method: 'GET', path: '/api/v2/invoices', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },

  // VCN
  { label: 'List VCN', method: 'GET', path: '/api/v1/vcn', params: [] },
  { label: 'Create VCN Card', method: 'POST', path: '/api/v1/vcn/card', params: [], body: '{}' },

  // Auth
  { label: 'Get OAuth Token', method: 'POST', path: '/oauth/token', params: [], body: 'grant_type=client_credentials' },

  // Logs (Legacy)
  { label: 'Get Logs (v1)', method: 'GET', path: '/api/v1/logs', params: [{ key: 'page', value: '0' }, { key: 'size', value: '20' }] },
]

export const MARKETS = [
  { label: 'México', value: 'mx', baseUrl: 'https://public-api.mx.clara.com' },
  { label: 'Brasil', value: 'br', baseUrl: 'https://public-api.br.clara.com' },
  { label: 'Colombia', value: 'co', baseUrl: 'https://public-api.co.clara.com' },
]

export const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']
