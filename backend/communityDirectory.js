const communities = [
  {
    id: 1,
    name: 'Montréal French Conversation Circle',
    city: 'Montréal',
    languages: ['fr', 'en'],
    category: 'language_exchange',
    description: 'Practise French in a small conversation group.',
    isDemo: true,
  },
  {
    id: 2,
    name: 'Montréal Newcomer Welcome Group',
    city: 'Montréal',
    languages: ['en', 'fr', 'zh'],
    category: 'newcomer_support',
    description: 'Meet other newcomers and exchange local tips.',
    isDemo: true,
  },
  {
    id: 3,
    name: 'Montréal Senior Neighbour Network',
    city: 'Montréal',
    languages: ['fr', 'en'],
    category: 'senior_support',
    description: 'Connect with neighbours for social visits and everyday help.',
    isDemo: true,
  },
  {
    id: 4,
    name: 'Québec City French Conversation Circle',
    city: 'Québec City',
    languages: ['fr', 'en'],
    category: 'language_exchange',
    description: 'Practise French with people in Québec City.',
    isDemo: true,
  },
];

const { ApiError } = require('./communityService');

function normalize(value) {
  return value.trim().normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
}

function readFilter(filters, key) {
  const value = Object.hasOwn(filters, key) ? filters[key] : '';
  if (typeof value !== 'string' || value.length > 100) {
    throw new ApiError(400, key + ' must be text of at most 100 characters');
  }
  return normalize(value);
}

function searchCommunities(filters) {
  const city = readFilter(filters, 'city');
  const language = readFilter(filters, 'language');
  const category = readFilter(filters, 'category');
  return communities.filter(group =>
    (!city || normalize(group.city) === city) &&
    (!language || group.languages.includes(language)) &&
    (!category || group.category === category)
  );
}

module.exports = { searchCommunities };
