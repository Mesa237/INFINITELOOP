const express = require('express');
const { searchCommunities } = require('./communityDirectory');
const {
  ApiError, CommunityService, POLICY_VERSION, isPositiveInt, positiveInt, requiredText,
} = require('./communityService');

const app = express();
const service = new CommunityService();
const parseJson = express.json({ limit: 16_384 });

function jsonBody(req, res, next) {
  if (!req.is('application/json') &&
      !/^application\/json(?:\s*;|\s*$)/i.test(req.get('Content-Type') ?? '')) {
    throw new ApiError(415, 'Use Content-Type: application/json');
  }
  parseJson(req, res, error => {
    if (error) {
      return next(error);
    }
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next(new ApiError(400, 'Send a JSON object'));
    }
    next();
  });
}

function parseId(raw) {
  return typeof raw === 'string' && /^\+?\d+$/.test(raw) ? Number(raw) : NaN;
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/policies/current', (req, res) => {
  res.json({
    version: POLICY_VERSION,
    text: 'Treat other members with respect, protect their privacy, and report abuse.',
  });
});
app.post('/communities/search', jsonBody, (req, res) => {
  res.json({ communities: searchCommunities(req.body) });
});

app.use((req, res, next) => {
  const userId = parseId(req.get('X-User-Id'));
  if (!isPositiveInt(userId)) {
    throw new ApiError(401, 'Provide a positive demo user ID in X-User-Id');
  }
  req.userId = userId;
  next();
});

app.param('id', (req, res, next, raw) => {
  req.resourceId = positiveInt(parseId(raw), 'Resource ID');
  next();
});

app.post('/agreements', jsonBody, (req, res) => {
  res.json(service.agree(req.userId, requiredText(req.body.version, 'version', 20)));
});
app.get('/help-requests', (req, res) => {
  if (Object.keys(req.query).some(key => key !== 'status')) {
    throw new ApiError(400, 'Use the status query parameter');
  }
  res.json({ requests: service.list(req.userId, req.query.status) });
});
app.post('/help-requests', jsonBody, (req, res) => {
  res.status(201).json(service.create(req.userId, req.body));
});
app.post('/help-requests/:id/accept', (req, res) => {
  res.json(service.accept(req.userId, req.resourceId));
});
app.post('/help-requests/:id/complete', (req, res) => {
  res.json(service.complete(req.userId, req.resourceId));
});
app.post('/help-requests/:id/reviews', jsonBody, (req, res) => {
  res.status(201).json(service.review(req.userId, req.resourceId, req.body));
});
app.get('/users/:id/rating', (req, res) => res.json(service.rating(req.resourceId)));
app.post('/blocks', jsonBody, (req, res) => {
  res.json(service.block(req.userId, positiveInt(req.body.userId, 'userId')));
});
app.post('/reports', jsonBody, (req, res) => {
  res.status(201).json(service.report(req.userId, req.body));
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.status === 413) {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (error.status === 400 || error.status === 415) {
    return res.status(error.status).json({ error: 'Send a valid JSON request' });
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const host = process.argv[2] ?? '127.0.0.1';
const port = Number(process.argv[3] ?? '8081');
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('Port must be an integer from 0 to 65535');
}
const server = app.listen(port, host, error => {
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.log('JavaScript API running on ' + host + ':' + server.address().port);
});
