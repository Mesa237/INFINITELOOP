const POLICY_VERSION = '1.0';
const STATUSES = new Set(['open', 'accepted', 'completed']);

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0 && value <= 2147483647;
}

function positiveInt(value, field) {
  if (!isPositiveInt(value)) {
    throw new ApiError(400, field + ' must be a positive integer');
  }
  return value;
}

function requiredText(value, field, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) {
    throw new ApiError(400, field + ' must contain 1 to ' + max + ' characters');
  }
  return text;
}

class CommunityService {
  constructor() {
    this.agreed = new Set();
    this.blocks = new Map();
    this.requests = new Map();
    this.reviews = new Map();
    this.reports = new Map();
    this.nextRequestId = 1;
    this.nextReportId = 1;
  }

  agree(user, version) {
    if (version !== POLICY_VERSION) {
      throw new ApiError(409, 'Accept the current policy version');
    }
    this.agreed.add(user);
    return { accepted: true, version };
  }

  list(user, status) {
    if (status !== undefined && !STATUSES.has(status)) {
      throw new ApiError(400, 'Unknown status');
    }
    return [...this.requests.values()].filter(request => {
      const participant = user === request.requesterId || user === request.volunteerId;
      const visible = participant ||
        (request.status === 'open' && !this.blocked(user, request.requesterId));
      return visible && (status === undefined || request.status === status);
    });
  }

  create(user, body) {
    this.requireAgreement(user);
    const title = requiredText(body.title, 'title', 120);
    const category = requiredText(body.category, 'category', 60);
    const description = requiredText(body.description, 'description', 1000);
    const request = {
      id: this.nextRequestId++,
      requesterId: user,
      volunteerId: null,
      title,
      category,
      description,
      status: 'open',
    };
    this.requests.set(request.id, request);
    return request;
  }

  accept(user, id) {
    this.requireAgreement(user);
    const request = this.find(id);
    if (this.blocked(user, request.requesterId)) {
      throw new ApiError(404, 'Request not found');
    }
    if (request.requesterId === user) {
      throw new ApiError(403, 'You cannot accept your own request');
    }
    if (request.status !== 'open') {
      throw new ApiError(409, 'This request is already taken');
    }
    request.volunteerId = user;
    request.status = 'accepted';
    return request;
  }

  complete(user, id) {
    this.requireAgreement(user);
    const request = this.ownedRequest(user, id);
    if (request.status !== 'accepted') {
      throw new ApiError(409, 'Only accepted requests can be completed');
    }
    request.status = 'completed';
    return request;
  }

  review(user, id, body) {
    this.requireAgreement(user);
    const request = this.ownedRequest(user, id);
    if (request.status !== 'completed') {
      throw new ApiError(409, 'Complete the request before reviewing it');
    }
    if (this.reviews.has(id)) {
      throw new ApiError(409, 'This request already has a review');
    }
    const stars = positiveInt(body.stars, 'stars');
    if (stars > 5) {
      throw new ApiError(400, 'stars must be an integer from 1 to 5');
    }
    const rawReason = Object.hasOwn(body, 'reason') ? body.reason : '';
    if (typeof rawReason !== 'string' || rawReason.trim().length > 1000) {
      throw new ApiError(400, 'reason must be text of at most 1000 characters');
    }
    const reason = rawReason.trim();
    if (stars < 4 && !reason) {
      throw new ApiError(400, 'A reason is required for 1 to 3 stars');
    }
    const review = { requestId: id, volunteerId: request.volunteerId, stars, reason };
    this.reviews.set(id, review);
    return review;
  }

  rating(volunteer) {
    const ratings = [...this.reviews.values()].filter(review => review.volunteerId === volunteer);
    const total = ratings.reduce((sum, review) => sum + review.stars, 0);
    return { reviewCount: ratings.length, averageStars: ratings.length ? total / ratings.length : null };
  }

  block(user, target) {
    this.checkTarget(user, target);
    if (!this.blocks.has(user)) {
      this.blocks.set(user, new Set());
    }
    this.blocks.get(user).add(target);
    return { blockedUserId: target };
  }

  report(user, body) {
    const target = positiveInt(body.userId, 'userId');
    this.checkTarget(user, target);
    const reason = requiredText(body.reason, 'reason', 1000);
    const reportId = this.nextReportId++;
    this.reports.set(reportId, { reporterId: user, userId: target, reason });
    return { reportId, status: 'submitted' };
  }

  checkTarget(user, target) {
    if (user === target) {
      throw new ApiError(400, 'Choose another user');
    }
  }

  blocked(first, second) {
    return this.blocks.get(first)?.has(second) || this.blocks.get(second)?.has(first);
  }

  requireAgreement(user) {
    if (!this.agreed.has(user)) {
      throw new ApiError(403, 'Accept the community policy first');
    }
  }

  find(id) {
    const request = this.requests.get(id);
    if (!request) {
      throw new ApiError(404, 'Request not found');
    }
    return request;
  }

  ownedRequest(user, id) {
    const request = this.find(id);
    if (request.requesterId !== user) {
      throw new ApiError(403, 'Only the requester can do this');
    }
    return request;
  }
}

module.exports = { ApiError, CommunityService, POLICY_VERSION, isPositiveInt, positiveInt, requiredText };
