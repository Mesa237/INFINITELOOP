import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import PublicServices from './public-services';
import {
  makeStyles,
  setThemeMode,
  THEME_MODES,
  useCoucouTheme,
} from '../theme/coucou';
const areas = ['Downtown', 'Le Plateau', 'Verdun'];
const people = [
  {
    name: 'Camille',
    initials: 'CM',
    area: areas[1],
    role: 'Local helper',
    languages: 'French · English',
    interest: 'Photo walks',
    bio: 'I know a little street with painted staircases. Bring your camera and we can explore together.',
  },
  {
    name: 'Noor',
    initials: 'NA',
    area: areas[0],
    role: 'Newcomer',
    languages: 'English · Arabic',
    interest: 'Coffee walks',
    bio: 'Just unpacked my last box. Looking for someone to try the cafés around Concordia with.',
  },
  {
    name: 'Lou',
    initials: 'LB',
    area: areas[2],
    role: 'Longtime local',
    languages: 'French · English',
    interest: 'Riverside walks',
    bio: 'I walk along the river most mornings and would love some company.',
  },
];
function Button({ label, onPress, soft = false, disabled = false }) {
  const s = useS();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        soft && s.soft,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, soft && s.softText]}>{label}</Text>
    </Pressable>
  );
}
const GROUPS = [
  {
    id: 1,
    name: 'Montréal French Conversation Circle',
    city: 'Montréal',
    languages: ['fr', 'en'],
    category: 'language_exchange',
    description: 'Practise French with neighbours.',
  },
  {
    id: 2,
    name: 'Montréal Newcomer Welcome Group',
    city: 'Montréal',
    languages: ['en', 'fr', 'zh'],
    category: 'newcomer_support',
    description: 'Meet newcomers and exchange local tips.',
  },
  {
    id: 3,
    name: 'Montréal Senior Neighbour Network',
    city: 'Montréal',
    languages: ['fr', 'en'],
    category: 'senior_support',
    description: 'Social visits and everyday help.',
  },
  {
    id: 4,
    name: 'Québec City French Conversation Circle',
    city: 'Québec City',
    languages: ['fr', 'en'],
    category: 'language_exchange',
    description: 'Find a conversation partner in Québec City.',
  },
];
const RULES =
  'Treat other members with respect, protect their privacy, and report abuse.';
const members = ['', 'You', 'Camille', 'Noor', 'Lou'];
function Choices({ title, values, labels, value, change }) {
  const s = useS();
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.bold}>{title}</Text>
      <View style={s.row}>
        {values.map((v, i) => (
          <Button
            key={v}
            label={labels[i]}
            soft={v !== value}
            onPress={() => change(v)}
          />
        ))}
      </View>
    </View>
  );
}
function Communities() {
  const { C } = useCoucouTheme();
  const s = useS();
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [category, setCategory] = useState('');
  const groups = GROUPS.filter(
    (g) =>
      (!city || g.city === city) &&
      (!language || g.languages.includes(language)) &&
      (!category || g.category === category),
  );
  return (
    <View style={[s.card, { backgroundColor: C.page }]}>
      <Text style={s.section}>Find a community</Text>
      <Choices
        title="City"
        values={['', 'Montréal', 'Québec City']}
        labels={['All cities', 'Montréal', 'Québec City']}
        value={city}
        change={setCity}
      />
      <Choices
        title="Language"
        values={['', 'en', 'fr', 'zh']}
        labels={['Any language', 'English', 'French', 'Chinese']}
        value={language}
        change={setLanguage}
      />
      <Choices
        title="Category"
        values={['', 'language_exchange', 'newcomer_support', 'senior_support']}
        labels={[
          'All categories',
          'Language exchange',
          'Newcomer support',
          'Senior support',
        ]}
        value={category}
        change={setCategory}
      />
      {groups.map((g) => (
        <View key={g.id} style={s.card}>
          <Text style={s.cardTitle}>{g.name}</Text>
          <Text style={s.meta}>
            {g.city} · {g.languages.join(' / ').toUpperCase()}
          </Text>
          <Text style={s.body}>{g.description}</Text>
        </View>
      ))}
      {!groups.length && (
        <Text style={s.body}>No matching communities. Try another filter.</Text>
      )}
    </View>
  );
}
// Neighbourhoods known to suggest_meeting_places (public.neighborhood_centres).
const NEIGHBOURHOODS = [
  'Downtown',
  'Le Plateau',
  'Mile End',
  'Verdun',
  'Côte-des-Neiges',
  'Notre-Dame-de-Grâce',
  'Saint-Henri',
  'Griffintown',
  'Old Montréal',
  'Outremont',
  'Rosemont',
  'Villeray',
  'Hochelaga',
  'Ahuntsic',
  'Montréal-Nord',
  'Saint-Laurent',
  'Lachine',
];
const CHAT_STATUSES = ['pending', 'accepted', 'completed'];
const initialsOf = (name) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

function Avatar({ name, url, size = 44 }) {
  const s = useS();
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return (
      <Image
        accessibilityLabel={(name || 'Neighbour') + ' profile picture'}
        source={{ uri: url }}
        style={[s.avatar, box]}
      />
    );
  }
  return (
    <View accessibilityLabel={(name || 'Neighbour') + ' initials'} style={[s.avatar, box]}>
      <Text style={[s.avatarText, { fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

function PersonRow({ name, url, onChat }) {
  const s = useS();
  return (
    <View style={s.personRow}>
      <Avatar name={name} url={url} />
      <Text style={[s.bold, { flex: 1 }]} numberOfLines={1}>
        {name || 'Neighbour'}
      </Text>
      {onChat && <Button soft label="Open chat" onPress={onChat} />}
    </View>
  );
}

// Next 7 days and hourly slots, so picking a time works the same on iOS, Android and web.
function nextDays() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    days.push({
      key: d.toDateString(),
      date: d,
      label:
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric' }),
    });
  }
  return days;
}
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const hourLabel = (h) => (h < 12 ? h + ' AM' : h === 12 ? '12 PM' : h - 12 + ' PM');
const formatMeetAt = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Time to confirm';
const OPTION_LABELS = {
  member: 'Member’s location',
  midpoint: 'Fair midpoint',
  volunteer: 'Volunteer’s chosen place',
};

function mapsUrl(proposal) {
  const hasCoords =
    typeof proposal.lat === 'number' && typeof proposal.lng === 'number';
  const name = encodeURIComponent(proposal.place_name);
  if (Platform.OS === 'ios') {
    return hasCoords
      ? `https://maps.apple.com/?ll=${proposal.lat},${proposal.lng}&q=${name}`
      : `https://maps.apple.com/?q=${name}`;
  }
  return hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${proposal.lat},${proposal.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${name}`;
}

const byCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at);
function upsertById(list, row) {
  const i = list.findIndex((item) => item.id === row.id);
  if (i === -1) return [...list, row].sort(byCreated);
  const next = list.slice();
  next[i] = { ...next[i], ...row };
  return next;
}

function MatchChat({ match, request, userId, names, avatars, onClose }) {
  const { C } = useCoucouTheme();
  const s = useS();
  const social = useSocial();
  const isMember = request.requester_id === userId;
  const otherId = isMember ? match.volunteer_id : request.requester_id;
  const otherName = names[otherId] || (isMember ? 'Volunteer' : 'Member');
  const scroll = useRef(null);

  const [messages, setMessages] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const [meetOpen, setMeetOpen] = useState(false);
  const [option, setOption] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [pickedPlace, setPickedPlace] = useState(null);
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [meetBusy, setMeetBusy] = useState(false);
  const [meetError, setMeetError] = useState('');
  const [busyProposal, setBusyProposal] = useState('');
  const days = nextDays();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const [{ data: messageRows, error: messageError }, { data: proposalRows, error: proposalError }] =
          await Promise.all([
            supabase
              .from('messages')
              .select('id, match_id, sender_id, body, created_at')
              .eq('match_id', match.id)
              .order('created_at', { ascending: true }),
            supabase
              .from('meeting_proposals')
              .select(
                'id, match_id, proposed_by, option, place_name, public_place_id, lat, lng, meet_at, status, created_at',
              )
              .eq('match_id', match.id)
              .order('created_at', { ascending: true }),
          ]);
        if (messageError) throw messageError;
        if (proposalError) throw proposalError;
        if (active) {
          setMessages(messageRows ?? []);
          setProposals(proposalRows ?? []);
        }
      } catch {
        if (active) setLoadError('Could not load this chat. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    const filter = `match_id=eq.${match.id}`;
    const channel = supabase
      .channel('match-chat:' + match.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        (payload) => setMessages((prev) => upsertById(prev, payload.new)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_proposals', filter },
        (payload) => {
          if (payload.new?.id) setProposals((prev) => upsertById(prev, payload.new));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ match_id: match.id, sender_id: userId, body })
        .select('id, match_id, sender_id, body, created_at')
        .single();
      if (error) throw error;
      setMessages((prev) => upsertById(prev, data));
      setDraft('');
    } catch {
      setSendError("Your message wasn't sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function resetMeet() {
    setOption('');
    setPlaceName('');
    setPlaces([]);
    setPickedPlace(null);
    setDay('');
    setHour('');
    setMeetError('');
  }

  async function chooseOption(next) {
    setOption(next);
    setMeetError('');
    setPickedPlace(null);
    if (next !== 'midpoint') return;
    setPlacesLoading(true);
    try {
      const { data, error } = await supabase.rpc('suggest_meeting_places', {
        target_match_id: match.id,
      });
      if (error) throw error;
      setPlaces(data ?? []);
    } catch {
      setPlaces([]);
      setMeetError('Could not find meeting places right now. Try again, or choose a place yourself.');
    } finally {
      setPlacesLoading(false);
    }
  }

  async function sendProposal() {
    const chosenDay = days.find((d) => d.key === day);
    if (!chosenDay || hour === '') return;
    const meetAt = new Date(chosenDay.date);
    meetAt.setHours(Number(hour), 0, 0, 0);
    const row = {
      match_id: match.id,
      proposed_by: userId,
      option,
      meet_at: meetAt.toISOString(),
    };
    if (option === 'midpoint') {
      if (!pickedPlace) return;
      Object.assign(row, {
        place_name: pickedPlace.name,
        public_place_id: pickedPlace.place_id,
        lat: pickedPlace.lat,
        lng: pickedPlace.lng,
      });
    } else {
      row.place_name = placeName.trim();
    }
    setMeetBusy(true);
    setMeetError('');
    try {
      const { data, error } = await supabase
        .from('meeting_proposals')
        .insert(row)
        .select(
          'id, match_id, proposed_by, option, place_name, public_place_id, lat, lng, meet_at, status, created_at',
        )
        .single();
      if (error) throw error;
      setProposals((prev) => upsertById(prev, data));
      resetMeet();
      setMeetOpen(false);
    } catch {
      setMeetError("Your proposal wasn't sent. Check your connection and try again.");
    } finally {
      setMeetBusy(false);
    }
  }

  async function answer(proposal, status) {
    setBusyProposal(proposal.id);
    setMeetError('');
    try {
      const { data, error } = await supabase
        .from('meeting_proposals')
        .update({ status })
        .eq('id', proposal.id)
        .select('id, status')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Not updated');
      setProposals((prev) => upsertById(prev, data));
    } catch {
      setMeetError('Could not update this proposal. Refresh the chat and try again.');
    } finally {
      setBusyProposal('');
    }
  }

  const timeline = [
    ...messages.map((m) => ({ kind: 'message', ...m })),
    ...proposals.map((p) => ({ kind: 'proposal', ...p })),
  ].sort(byCreated);

  const myOptions = isMember ? ['member', 'midpoint'] : ['midpoint', 'volunteer'];
  const myOptionLabels = isMember
    ? ['My location', 'Fair midpoint']
    : ['Fair midpoint', 'My chosen place'];
  const placeReady =
    option === 'midpoint' ? !!pickedPlace : placeName.trim().length >= 2;
  const canPropose = !!option && placeReady && !!day && hour !== '' && !meetBusy;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={social.chatHeading}>
        <View style={[s.personRow, { flex: 1 }]}>
          <Avatar name={otherName} url={avatars[otherId]} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[s.bold, { color: C.onAccent }]} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={[s.meta, { color: C.onAccentMuted }]} numberOfLines={1}>
              {request.title}
            </Text>
          </View>
        </View>
        <View style={s.row}>
          <Button
            soft
            label={meetOpen ? 'Close' : 'Meet'}
            onPress={() => {
              if (meetOpen) resetMeet();
              setMeetOpen(!meetOpen);
            }}
          />
          <Button soft label="‹ Board" onPress={onClose} />
        </View>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        onContentSizeChange={() => {
          if (!meetOpen) scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        {meetOpen && (
          <View style={s.card}>
            <Text style={s.section}>Where should you meet?</Text>
            <Choices
              title="Choose an option"
              values={myOptions}
              labels={myOptionLabels}
              value={option}
              change={chooseOption}
            />
            {(option === 'member' || option === 'volunteer') && (
              <TextInput
                accessibilityLabel="Place name"
                style={s.input}
                placeholderTextColor={C.placeholder}
                placeholder="Place name, e.g. Atwater Library"
                value={placeName}
                onChangeText={setPlaceName}
                maxLength={200}
              />
            )}
            {option === 'midpoint' &&
              (placesLoading ? (
                <Text style={s.meta}>Finding fair places…</Text>
              ) : (
                places.map((place) => {
                  const mine = isMember ? place.member_km : place.volunteer_km;
                  const theirs = isMember ? place.volunteer_km : place.member_km;
                  const picked = pickedPlace?.place_id === place.place_id;
                  return (
                    <Pressable
                      key={place.place_id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: picked }}
                      onPress={() => setPickedPlace(place)}
                      style={[s.card, picked && s.pickedCard]}
                    >
                      <Text style={s.bold}>
                        {picked ? '✓ ' : ''}
                        {place.name}
                      </Text>
                      <Text style={s.meta}>
                        You: {Number(mine).toFixed(1)} km · Them: {Number(theirs).toFixed(1)} km
                      </Text>
                    </Pressable>
                  );
                })
              ))}
            {!!option && (
              <>
                <Choices
                  title="Day"
                  values={days.map((d) => d.key)}
                  labels={days.map((d) => d.label)}
                  value={day}
                  change={setDay}
                />
                <Choices
                  title="Time"
                  values={HOURS.map(String)}
                  labels={HOURS.map(hourLabel)}
                  value={hour}
                  change={setHour}
                />
                <Button
                  label={meetBusy ? 'Sending…' : 'Send proposal'}
                  disabled={!canPropose}
                  onPress={sendProposal}
                />
              </>
            )}
          </View>
        )}
        {!!meetError && (
          <Text accessibilityLiveRegion="polite" style={{ color: C.error }}>
            {meetError}
          </Text>
        )}
        {loading ? (
          <Text style={s.meta}>Loading chat…</Text>
        ) : loadError ? (
          <Text style={{ color: C.error }}>{loadError}</Text>
        ) : !timeline.length ? (
          <Text style={s.meta}>Say hello to {otherName}.</Text>
        ) : null}
        {timeline.map((item) =>
          item.kind === 'message' ? (
            <View
              key={'m' + item.id}
              style={[social.bubble, item.sender_id === userId && social.mine]}
            >
              <Text style={[s.body, social.bubbleText]}>{item.body}</Text>
            </View>
          ) : (
            <View key={'p' + item.id} style={[s.card, s.proposalCard]}>
              <Text style={s.meta}>
                {OPTION_LABELS[item.option] ?? 'Meeting'} ·{' '}
                {item.proposed_by === userId ? 'You proposed' : otherName + ' proposed'} ·{' '}
                {item.status.toUpperCase()}
              </Text>
              <Text style={s.cardTitle}>{item.place_name}</Text>
              <Text style={s.body}>{formatMeetAt(item.meet_at)}</Text>
              {item.status === 'proposed' &&
                (item.proposed_by === userId ? (
                  <Button
                    soft
                    label="Cancel"
                    disabled={busyProposal === item.id}
                    onPress={() => answer(item, 'cancelled')}
                  />
                ) : (
                  <View style={s.row}>
                    <Button
                      label="Accept"
                      disabled={busyProposal === item.id}
                      onPress={() => answer(item, 'accepted')}
                    />
                    <Button
                      soft
                      label="Decline"
                      disabled={busyProposal === item.id}
                      onPress={() => answer(item, 'declined')}
                    />
                  </View>
                ))}
              {item.status === 'accepted' && (
                <Button
                  label="Open in Maps"
                  onPress={() => Linking.openURL(mapsUrl(item))}
                />
              )}
            </View>
          ),
        )}
      </ScrollView>
      {!!sendError && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: C.error, paddingHorizontal: 12 }}
        >
          {sendError}
        </Text>
      )}
      <View style={social.composer}>
        <TextInput
          accessibilityLabel="Message"
          style={[s.input, { flex: 1 }]}
          placeholderTextColor={C.placeholder}
          placeholder="Write a message…"
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
        />
        <Button
          label={sending ? 'Sending…' : 'Send'}
          disabled={sending || !draft.trim()}
          onPress={send}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function CommunityBoard({ area, displayName, rulesAccepted, agree }) {
  const { C } = useCoucouTheme();
  const s = useS();
  const [userId, setUserId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requesterNames, setRequesterNames] = useState({});
  const [matches, setMatches] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratingsByProfile, setRatingsByProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('companionship');
  const [editing, setEditing] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [stars, setStars] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [avatars, setAvatars] = useState({});
  const [chatWith, setChatWith] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      setLoading(true);
      setError('');
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Please sign in to view community help.');

        const { data: rows, error: requestError } = await supabase
          .from('help_requests')
          .select(
            'id, requester_id, title, description, help_type, neighborhood, status, created_at',
          )
          .order('created_at', { ascending: false });
        if (requestError) throw requestError;

        const requestRows = rows ?? [];
        const requestIds = requestRows.map((row) => row.id);
        let matchRows = [];
        let reviewRows = [];
        if (requestIds.length) {
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .select('id, help_request_id, volunteer_id, status')
            .in('help_request_id', requestIds);
          if (matchError) throw matchError;
          matchRows = matchData ?? [];

          const { data: reviewData, error: reviewError } = await supabase
            .from('reviews')
            .select('id, help_request_id, reviewer_id, reviewee_id, rating, reason')
            .in('help_request_id', requestIds);
          if (reviewError) throw reviewError;
          reviewRows = reviewData ?? [];
        }

        const profileIds = [
          ...new Set([
            ...requestRows.map((row) => row.requester_id),
            ...matchRows.map((match) => match.volunteer_id),
          ]),
        ];
        let profiles = [];
        if (profileIds.length) {
          // avatar_url is optional: fall back to names only if the column isn't there yet.
          let { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', profileIds);
          if (profileError) {
            ({ data, error: profileError } = await supabase
              .from('profiles')
              .select('id, display_name')
              .in('id', profileIds));
          }
          if (profileError) throw profileError;
          profiles = data ?? [];
        }

        const ratingIds = [
          ...new Set([user.id, ...matchRows.map((match) => match.volunteer_id)]),
        ];
        const ratingPairs = await Promise.all(
          ratingIds.map(async (profileId) => {
            try {
              const { data, error: ratingError } = await supabase.rpc(
                'get_profile_rating',
                { target_profile_id: profileId },
              );
              if (ratingError) return null;
              return [profileId, data?.[0] ?? null];
            } catch {
              return null;
            }
          }),
        );

        if (active) {
          setUserId(user.id);
          setRequests(requestRows);
          setMatches(matchRows);
          setReviews(reviewRows);
          setRatingsByProfile(
            Object.fromEntries(ratingPairs.filter((pair) => pair !== null)),
          );
          setRequesterNames(
            Object.fromEntries(profiles.map((profile) => [profile.id, profile.display_name])),
          );
          setAvatars(
            Object.fromEntries(
              profiles.map((profile) => [profile.id, profile.avatar_url || null]),
            ),
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load help requests. Try again.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRequests();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function publishRequest() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const neighborhood = (area || 'Montréal').trim();

    if (!userId || cleanTitle.length < 5 || cleanDescription.length < 10 || !neighborhood) {
      setError('Add a title, at least 10 characters of detail, and a neighbourhood.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('help_requests')
        .insert({
          requester_id: userId,
          title: cleanTitle,
          description: cleanDescription,
          help_type: category,
          neighborhood,
          status: 'open',
        })
        .select(
          'id, requester_id, title, description, help_type, neighborhood, status, created_at',
        )
        .single();

      if (insertError) throw insertError;
      setRequests((previous) => [data, ...previous]);
      setRequesterNames((previous) => ({
        ...previous,
        [userId]: displayName || 'You',
      }));
      setTitle('');
      setDescription('');
      setCategory('companionship');
      setEditing(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not publish your request. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function offerToHelp(requestId) {
    if (!userId || !rulesAccepted) return;
    setBusyAction(requestId + ':offer');
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('matches')
        .insert({
          help_request_id: requestId,
          volunteer_id: userId,
          status: 'pending',
        })
        .select('id, help_request_id, volunteer_id, status')
        .single();
      if (insertError) throw insertError;
      setMatches((previous) => [...previous, data]);
      setRequesterNames((previous) => ({
        ...previous,
        [userId]: displayName || 'You',
      }));
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Could not send your offer. Refresh and try again.',
      );
    } finally {
      setBusyAction('');
    }
  }

  async function updateMatch(match, nextStatus) {
    setBusyAction(match.id + ':' + nextStatus);
    setError('');
    try {
      const { data, error: updateError } = await supabase
        .from('matches')
        .update({ status: nextStatus })
        .eq('id', match.id)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('This offer was not updated. Refresh and try again.');
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Could not update this offer. Refresh and try again.',
      );
    } finally {
      setBusyAction('');
    }
  }

  async function submitReview(request, match) {
    const rating = Number(stars);
    const peerId =
      request.requester_id === userId ? match.volunteer_id : request.requester_id;
    if (!userId || !peerId || !rating || (rating < 4 && !reviewReason.trim())) return;

    setBusyAction(request.id + ':review');
    setError('');
    try {
      const { error: reviewError } = await supabase.from('reviews').insert({
        help_request_id: request.id,
        reviewer_id: userId,
        reviewee_id: peerId,
        rating,
        reason: reviewReason.trim() || null,
      });
      if (reviewError) throw reviewError;
      setReviewingRequest(null);
      setStars('');
      setReviewReason('');
      setReloadKey((key) => key + 1);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Could not save your rating. Try again.',
      );
    } finally {
      setBusyAction('');
    }
  }

  if (chatWith && userId) {
    return (
      <MatchChat
        match={chatWith.match}
        request={chatWith.request}
        userId={userId}
        names={requesterNames}
        avatars={avatars}
        onClose={() => setChatWith(null)}
      />
    );
  }

  const openChat = (match, request) => () => setChatWith({ match, request });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Community help</Text>
      <View style={s.card}>
        <Text style={s.section}>Community rules · v1.0</Text>
        <Text style={s.body}>{RULES}</Text>
        <Button
          label={rulesAccepted ? 'Rules accepted' : 'Agree to rules'}
          disabled={rulesAccepted}
          onPress={agree}
        />
      </View>
      <Button
        label={editing ? 'Cancel request' : 'Post a request'}
        disabled={!rulesAccepted}
        onPress={() => {
          setError('');
          setEditing(!editing);
        }}
      />
      {editing && (
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholderTextColor={C.placeholder}
            placeholder="Request title"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <Choices
            title="What kind of help?"
            values={[
              'appointments',
              'paperwork',
              'transportation',
              'companionship',
              'language_practice',
              'technology',
              'other',
            ]}
            labels={[
              'Appointments',
              'Paperwork',
              'Transportation',
              'Companionship',
              'Language practice',
              'Technology',
              'Other',
            ]}
            value={category}
            change={setCategory}
          />
          <Text style={s.meta}>Neighbourhood: {area || 'Montréal'}</Text>
          <TextInput
            style={s.input}
            multiline
            placeholderTextColor={C.placeholder}
            placeholder="What help do you need? (at least 10 characters)"
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
          />
          <Button
            label={saving ? 'Publishing…' : 'Publish request'}
            disabled={
              saving ||
              !userId ||
              title.trim().length < 5 ||
              description.trim().length < 10
            }
            onPress={publishRequest}
          />
        </View>
      )}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={{ color: C.error }}>
          {error}
        </Text>
      )}
      {loading ? (
        <Text style={s.meta}>Loading help requests…</Text>
      ) : requests.length ? (
        requests.map((request) => {
          const requestMatches = matches.filter(
            (match) => match.help_request_id === request.id,
          );
          const myOffer = requestMatches.find(
            (match) => match.volunteer_id === userId,
          );
          const acceptedMatch = requestMatches.find(
            (match) => match.status === 'accepted' || match.status === 'completed',
          );
          const pendingOffers =
            request.requester_id === userId
              ? requestMatches.filter((match) => match.status === 'pending')
              : [];
          const requestReviews = reviews.filter(
            (review) => review.help_request_id === request.id,
          );
          const myReview = requestReviews.find(
            (review) => review.reviewer_id === userId,
          );
          const isParticipant =
            request.requester_id === userId ||
            requestMatches.some((match) => match.volunteer_id === userId);

          return (
            <View key={request.id} style={s.card}>
              <Text style={s.meta}>
                {request.help_type.replaceAll('_', ' ')} · {request.status.toUpperCase()}
              </Text>
              <Text style={s.cardTitle}>{request.title}</Text>
              <Text style={s.body}>{request.description}</Text>
              <Text style={s.meta}>
                {request.neighborhood} · Requested by{' '}
                {requesterNames[request.requester_id] ||
                  (request.requester_id === userId ? displayName || 'You' : 'Neighbour')}
              </Text>

              {request.requester_id !== userId &&
                request.status === 'open' &&
                !myOffer &&
                rulesAccepted && (
                  <Button
                    label={busyAction === request.id + ':offer' ? 'Sending offer…' : 'Offer to help'}
                    disabled={Boolean(busyAction)}
                    onPress={() => offerToHelp(request.id)}
                  />
                )}

              {myOffer?.status === 'pending' &&
                request.requester_id !== userId && (
                  <>
                    <PersonRow
                      name={requesterNames[request.requester_id] || 'Member'}
                      url={avatars[request.requester_id]}
                      onChat={openChat(myOffer, request)}
                    />
                    <Text style={s.meta}>Your offer is waiting for a response.</Text>
                    <Button
                      soft
                      label="Withdraw offer"
                      disabled={Boolean(busyAction)}
                      onPress={() => updateMatch(myOffer, 'cancelled')}
                    />
                  </>
                )}
              {(myOffer?.status === 'rejected' || myOffer?.status === 'cancelled') && (
                <Text style={s.meta}>
                  {myOffer.status === 'rejected'
                    ? 'Your offer was declined.'
                    : 'Your offer is closed.'}
                </Text>
              )}

              {pendingOffers.map((offer) => (
                <View key={offer.id} style={[s.card, { backgroundColor: C.page }]}>
                  <PersonRow
                    name={requesterNames[offer.volunteer_id] || 'Volunteer'}
                    url={avatars[offer.volunteer_id]}
                    onChat={openChat(offer, request)}
                  />
                  <Text style={s.bold}>
                    Offer from {requesterNames[offer.volunteer_id] || 'a neighbour'}
                    {ratingsByProfile[offer.volunteer_id]?.review_count > 0
                      ? ' · ' +
                        Number(ratingsByProfile[offer.volunteer_id].average_rating).toFixed(1) +
                        ' ★ (' +
                        ratingsByProfile[offer.volunteer_id].review_count +
                        ')'
                      : ''}
                  </Text>
                  <Button
                    label="Accept volunteer"
                    disabled={
                      request.status !== 'open' ||
                      Boolean(busyAction) ||
                      !rulesAccepted
                    }
                    onPress={() => updateMatch(offer, 'accepted')}
                  />
                  <Button
                    soft
                    label="Decline offer"
                    disabled={Boolean(busyAction)}
                    onPress={() => updateMatch(offer, 'rejected')}
                  />
                </View>
              ))}

              {acceptedMatch && (
                <View style={[s.card, { backgroundColor: C.page }]}>
                  {isParticipant && (
                    <PersonRow
                      name={
                        acceptedMatch.volunteer_id === userId
                          ? requesterNames[request.requester_id] || 'Member'
                          : requesterNames[acceptedMatch.volunteer_id] || 'Volunteer'
                      }
                      url={
                        avatars[
                          acceptedMatch.volunteer_id === userId
                            ? request.requester_id
                            : acceptedMatch.volunteer_id
                        ]
                      }
                      onChat={
                        CHAT_STATUSES.includes(acceptedMatch.status)
                          ? openChat(acceptedMatch, request)
                          : undefined
                      }
                    />
                  )}
                  <Text style={s.bold}>
                    Volunteer: {requesterNames[acceptedMatch.volunteer_id] || 'Neighbour'}
                  </Text>
                  {acceptedMatch.status === 'accepted' && isParticipant && (
                    <>
                      <Text style={s.meta}>Help is matched. Mark it complete when you are both done.</Text>
                      <Button
                        label={
                          busyAction === acceptedMatch.id + ':completed'
                            ? 'Saving…'
                            : 'Confirm completion'
                        }
                        disabled={Boolean(busyAction) || !rulesAccepted}
                        onPress={() => updateMatch(acceptedMatch, 'completed')}
                      />
                      <Button
                        soft
                        label="Cancel match"
                        disabled={Boolean(busyAction)}
                        onPress={() => updateMatch(acceptedMatch, 'cancelled')}
                      />
                    </>
                  )}
                  {acceptedMatch.status === 'completed' && (
                    <>
                      <Text style={s.meta}>Help completed · rate your experience</Text>
                      {requestReviews.map((review) => (
                        <Text key={review.id} style={s.meta}>
                          {review.reviewer_id === userId
                            ? 'Your rating'
                            : (requesterNames[review.reviewer_id] || 'Neighbour') + ' rated'}
                          : {review.rating}/5
                          {review.reason ? ' · ' + review.reason : ''}
                        </Text>
                      ))}
                      {myReview ? (
                        <Text style={s.meta}>You have submitted your rating.</Text>
                      ) : reviewingRequest === request.id ? (
                        <>
                          <Choices
                            title="Rate your experience"
                            values={['1', '2', '3', '4', '5']}
                            labels={['1 ★', '2 ★', '3 ★', '4 ★', '5 ★']}
                            value={stars}
                            change={setStars}
                          />
                          <TextInput
                            style={s.input}
                            multiline
                            placeholderTextColor={C.placeholder}
            placeholder={
                              Number(stars) > 0 && Number(stars) < 4
                                ? 'Reason required for 1–3 stars'
                                : 'Comment (optional)'
                            }
                            maxLength={1000}
                            value={reviewReason}
                            onChangeText={setReviewReason}
                          />
                          <Button
                            label={
                              busyAction === request.id + ':review'
                                ? 'Saving rating…'
                                : 'Submit rating'
                            }
                            disabled={
                              Boolean(busyAction) ||
                              !stars ||
                              (Number(stars) < 4 && !reviewReason.trim())
                            }
                            onPress={() => submitReview(request, acceptedMatch)}
                          />
                          <Button
                            soft
                            label="Cancel rating"
                            onPress={() => setReviewingRequest(null)}
                          />
                        </>
                      ) : (
                        <Button
                          label="Rate this experience"
                          disabled={!rulesAccepted}
                          onPress={() => {
                            setReviewingRequest(request.id);
                            setStars('');
                            setReviewReason('');
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={s.card}>
          <Text style={s.body}>No help requests yet. You can post the first one.</Text>
        </View>
      )}
      {!loading && (
        <Button
          soft
          label="Refresh requests"
          onPress={() => setReloadKey((key) => key + 1)}
        />
      )}
    </ScrollView>
  );
}
const useS = makeStyles((C) => ({
  avatar: {
    backgroundColor: C.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { color: C.onAccent, fontWeight: '900' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickedCard: { borderColor: C.primary, borderWidth: 2 },
  proposalCard: { borderColor: C.yellow, borderWidth: 2 },
  page: { flex: 1, backgroundColor: C.page },
  content: {
    width: '100%',
    maxWidth: 660,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 44,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brand: { fontSize: 23, letterSpacing: -1, fontWeight: '900', color: C.text },
  logoImg: { width: 28, height: 28, borderRadius: 8 },
  heroLogo: { position: 'absolute', top: -10, right: -10, width: 130, height: 130, opacity: 0.25 },
  pill: {
    backgroundColor: C.lilac,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hero: {
    backgroundColor: C.yellow,
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    gap: 16,
  },
  heroMark: {
    position: 'absolute',
    top: -38,
    right: -15,
    fontSize: 158,
    color: C.sunMark,
  },
  eyebrow: { color: C.onAccent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  heroTitle: {
    color: C.onAccent,
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -2,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 26,
    backgroundColor: C.track,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 22,
  },
  active: { backgroundColor: C.primary },
  tabLabel: {
    color: C.text,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    fontSize: 23,
    color: C.text,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    backgroundColor: C.card,
  },
  title: { fontSize: 30, color: C.text, fontWeight: '900', letterSpacing: -1 },
  cardTitle: {
    fontSize: 22,
    color: C.text,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  body: { color: C.muted, fontSize: 16, lineHeight: 23 },
  meta: { color: C.muted, fontWeight: '700', fontSize: 13 },
  bold: { color: C.text, fontWeight: '700' },
  button: {
    backgroundColor: C.primary,
    borderRadius: 18,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soft: { backgroundColor: C.softBg },
  softText: { color: C.softText },
  buttonText: { color: C.onPrimary, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  portrait: {
    backgroundColor: C.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    height: 170,
    borderRadius: 18,
    overflow: 'hidden',
  },
  orbit: {
    position: 'absolute',
    width: '130%',
    height: 42,
    backgroundColor: C.onAccent,
    transform: [{ rotate: '-16deg' }],
  },
  sun: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontWeight: '900',
    fontSize: 45,
    letterSpacing: -3,
    color: C.onAccent,
  },
  stamp: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: C.page,
    color: C.text,
    padding: 6,
    fontWeight: '700',
  },
  scrim: {
    flex: 1,
    backgroundColor: C.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: C.page,
    borderTopWidth: 8,
    borderTopColor: C.yellow,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sheetBody: { padding: 20, gap: 13 },
  input: {
    color: C.text,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    padding: 13,
    borderRadius: 14,
    fontSize: 16,
  },
  star: {
    minWidth: 42,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.yellow,
    borderRadius: 12,
  },
}));
const initialPosts = [
  {
    id: 1,
    author: 'Noor',
    area: 'Downtown',
    topic: 'Coffee walk',
    content:
      'Anyone up for a coffee walk near Concordia on Friday? I moved here last week and would love some company.',
    likes: 4,
  },
  {
    id: 2,
    author: 'Camille',
    area: 'Le Plateau',
    topic: 'Photo walk',
    content:
      'Taking my camera out for the colourful staircases this weekend. Beginners welcome!',
    likes: 8,
  },
  {
    id: 3,
    author: 'Lou',
    area: 'Verdun',
    topic: 'Language exchange',
    content:
      'English and French by the river? Let’s practise a few phrases on a walk.',
    likes: 3,
  },
];
const matches = (query, ...values) =>
  values.join(' ').toLowerCase().includes(query.trim().toLowerCase());
export default function CoucouSocial() {
  const { C, mode: themeMode } = useCoucouTheme();
  const s = useS();
  const social = useSocial();
  const [tab, setTab] = useState('Feed');
  const [trail, setTrail] = useState([]);
  const detail = trail[trail.length - 1];
  const [modal, setModal] = useState('location');
  const [area, setArea] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportReason, setReportReason] = useState('');
  const [notice, setNotice] = useState('');
  const [posts, setPosts] = useState(initialPosts);
  const [likes, setLikes] = useState([]);
  const [query, setQuery] = useState('');
  const [postText, setPostText] = useState('');
  const [postArea, setPostArea] = useState('Downtown');
  const [bio, setBio] = useState('');
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [neighbourhoodSaving, setNeighbourhoodSaving] = useState(false);
  async function saveNeighbourhood(name) {
    if (!currentUserId || neighbourhoodSaving) return;
    setNeighbourhoodSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ neighborhood: name })
        .eq('id', currentUserId)
        .select('id, neighborhood')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Not saved');
      setCurrentProfile((prev) => ({ ...prev, neighborhood: data.neighborhood }));
      setNotice('Neighbourhood saved.');
    } catch {
      setNotice('Could not save your neighbourhood. Try again.');
    } finally {
      setNeighbourhoodSaving(false);
    }
  }
  const [profileRating, setProfileRating] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Please sign in to view your profile.');

        let profileData;
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, role, languages, neighborhood, bio')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        profileData = data;

        if (!profileData) {
          const fallbackName =
            user.user_metadata?.display_name ||
            user.email?.split('@')[0] ||
            'New member';
          const { data: created, error: createError } = await supabase
            .from('profiles')
            .upsert({ id: user.id, display_name: fallbackName.slice(0, 80) })
            .select('id, display_name, role, languages, neighborhood, bio')
            .single();
          if (createError) throw createError;
          profileData = created;
        }

        let ratingSummary = null;
        try {
          const { data: ratingData, error: ratingError } = await supabase.rpc(
            'get_profile_rating',
            { target_profile_id: user.id },
          );
          if (!ratingError) ratingSummary = ratingData?.[0] ?? null;
        } catch {
          ratingSummary = null;
        }

        if (active) {
          setCurrentUserId(user.id);
          setCurrentProfile(profileData);
          setProfileRating(ratingSummary);
          setBio(profileData.bio ?? '');
        }
      } catch (loadError) {
        if (active) {
          setNotice(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your profile.',
          );
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);
  const [bioDraft, setBioDraft] = useState('');
  const [chatDrafts, setChatDrafts] = useState({});
  const [threads, setThreads] = useState({
    Noor: [{ id: 1, text: 'Hey! Want to join the coffee walk?', own: false }],
  });
  const nextId = useRef(10);
  const chatScroll = useRef(null);
  const [visitedHelp, setVisitedHelp] = useState(false);
  const close = () => setModal(null);
  const go = (next) => setTrail((prev) => [...prev, next]);
  const back = () => setTrail((prev) => prev.slice(0, -1));
  const profile = (name) => {
    setNotice('');
    if (name === 'You') {
      setTab('Me');
      setTrail([]);
    } else go({ kind: 'profile', name });
  };
  const inArea = (value) => !area || area === value;
  const filteredPosts = posts.filter(
    (p) =>
      !blocked.includes(p.author) &&
      inArea(p.area) &&
      matches(query, p.content, p.topic, p.author, p.area),
  );
  const filteredPeople = people.filter(
    (p) =>
      !blocked.includes(p.name) &&
      inArea(p.area) &&
      matches(query, p.name, p.bio, p.interest, p.area, p.languages),
  );
  const author =
    detail?.kind === 'profile'
      ? people.find((p) => p.name === detail.name)
      : undefined;
  const activeChat = detail?.kind === 'chat' ? detail.name : null;
  const openHelp = () => {
    setVisitedHelp(true);
    go({ kind: 'help' });
  };
  function postCard(p) {
    const liked = likes.includes(p.id);
    return (
      <View key={p.id} style={s.card}>
        <Pressable accessibilityRole="button" onPress={() => profile(p.author)}>
          <Text style={s.bold}>{p.author} ↗</Text>
          <Text style={s.meta}>
            {p.area} · {p.topic}
          </Text>
        </Pressable>
        <Text style={s.body}>{p.content}</Text>
        <View style={s.row}>
          <Button
            soft
            label={(liked ? '♥ ' : '♡ ') + (p.likes + Number(liked))}
            onPress={() =>
              setLikes((prev) =>
                prev.includes(p.id)
                  ? prev.filter((id) => id !== p.id)
                  : [...prev, p.id],
              )
            }
          />
          {p.author !== 'You' && (
            <Button
              soft
              label="Message"
              onPress={() => go({ kind: 'chat', name: p.author })}
            />
          )}
        </View>
      </View>
    );
  }
  function send() {
    if (!activeChat) return;
    const text = (chatDrafts[activeChat] ?? '').trim();
    if (!text) return;
    const message = { id: nextId.current++, own: true, text };
    setThreads((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] ?? []), message],
    }));
    setChatDrafts((prev) => ({ ...prev, [activeChat]: '' }));
  }
  return (
    <SafeAreaView style={s.page}>
      <View style={social.top}>
        {detail ? (
          <Button soft label="‹ Back" onPress={back} />
        ) : (
          <Text style={s.brand}>          <Image source={require('../../assets/images/logo.jpg')} style={s.logoImg} resizeMode="contain" /> CouCouMTL</Text>
        )}
        <View style={social.topRight}>
          <Button
            label="Sign out"
            onPress={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) setNotice(error.message);
            }}
          />
          <Button
            soft
            label={area ?? 'Montréal ▾'}
            onPress={() => setModal('location')}
          />
        </View>
      </View>
      {visitedHelp && (
        <View
          style={{
            flex: 1,
            display: detail?.kind === 'help' ? 'flex' : 'none',
          }}
        >
          <CommunityBoard
            area={area}
            displayName={currentProfile?.display_name}
            rulesAccepted={rulesAccepted}
            agree={() => setRulesAccepted(true)}
          />
        </View>
      )}
      {activeChat ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={social.chatHeading}>
            <Text style={[s.section, { color: C.onAccent }]}>{activeChat}</Text>
            <Button
              soft
              label="View profile"
              onPress={() => profile(activeChat)}
            />
          </View>
          <ScrollView
            ref={chatScroll}
            contentContainerStyle={s.content}
            onContentSizeChange={() =>
              chatScroll.current?.scrollToEnd({ animated: false })
            }
          >
            {!threads[activeChat]?.length && (
              <Text style={s.meta}>Say hello to {activeChat}.</Text>
            )}
            {(threads[activeChat] ?? []).map((m) => (
              <View key={m.id} style={[social.bubble, m.own && social.mine]}>
                <Text style={[s.body, social.bubbleText]}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={social.composer}>
            <TextInput
              accessibilityLabel="Message"
              style={[s.input, { flex: 1 }]}
              value={chatDrafts[activeChat] ?? ''}
              placeholderTextColor={C.placeholder}
            placeholder="Write a message…"
              onChangeText={(t) =>
                setChatDrafts((prev) => ({ ...prev, [activeChat]: t }))
              }
            />
            <Button
              label="Send"
              disabled={!chatDrafts[activeChat]?.trim()}
              onPress={send}
            />
          </View>
        </KeyboardAvoidingView>
      ) : !detail && tab === 'Services' ? (
        <PublicServices />
      ) : (
        detail?.kind !== 'help' && (
          <ScrollView
            key={detail?.kind === 'profile' ? detail.name : tab}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {(!detail && tab === 'Me') || author ? (
              <>
                <View style={s.portrait}>
                  <View style={s.orbit} />
                  <View style={s.sun}>
                    <Text style={s.monogram}>{author?.initials ?? 'ME'}</Text>
                  </View>
                </View>
                <Text style={s.title}>
                  {author?.name ?? currentProfile?.display_name ?? 'My profile'}
                </Text>
                <Text style={s.meta}>
                  {author
                    ? author.role + ' · ' + author.area
                    : (currentProfile?.role === 'volunteer'
                        ? 'Volunteer'
                        : currentProfile?.role === 'both'
                          ? 'Newcomer · Volunteer'
                          : 'Newcomer') +
                      ' · ' +
                      (currentProfile?.neighborhood || area || 'Montréal')}
                </Text>
                {!author && (
                  <Text style={s.meta}>
                    {profileRating?.review_count > 0
                      ? Number(profileRating.average_rating).toFixed(1) +
                        ' ★ · ' +
                        profileRating.review_count +
                        (profileRating.review_count === 1 ? ' review' : ' reviews')
                      : 'No reviews yet'}
                  </Text>
                )}
                <Text style={s.body}>
                  {(author?.bio ?? bio) || 'Add a short bio to introduce yourself.'}
                </Text>
                {author ? (
                  <>
                    <Text style={s.bold}>
                      {author.languages} · {author.interest}
                    </Text>
                    <Button
                      label={'Message ' + author.name}
                      onPress={() => go({ kind: 'chat', name: author.name })}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      soft
                      label="Edit bio"
                      onPress={() => {
                        setBioDraft(bio);
                        setModal('edit');
                      }}
                    />
                    {['volunteer', 'both'].includes(currentProfile?.role) &&
                      !currentProfile?.neighborhood && (
                        <View style={[s.card, s.proposalCard]}>
                          <Text style={s.bold}>Set your neighbourhood</Text>
                          <Text style={s.body}>
                            When you offer help, we suggest a fair meeting place
                            between your neighbourhood and the member&apos;s. Choose
                            yours so the midpoint is accurate.
                          </Text>
                          <Choices
                            title={neighbourhoodSaving ? 'Saving…' : 'Your neighbourhood'}
                            values={NEIGHBOURHOODS}
                            labels={NEIGHBOURHOODS}
                            value=""
                            change={saveNeighbourhood}
                          />
                        </View>
                      )}
                  </>
                )}
                {author ? (
                  <View style={s.row}>
                    <Button
                      soft
                      label="Block user"
                      onPress={() => setModal('block')}
                    />
                    <Button
                      soft
                      label="Report user"
                      onPress={() => {
                        setReportReason('');
                        setNotice('');
                        setModal('report');
                      }}
                    />
                  </View>
                ) : (
                  <>
                    <Choices
                      title="Appearance"
                      values={THEME_MODES}
                      labels={['Light', 'Dark', 'Auto']}
                      value={themeMode}
                      change={setThemeMode}
                    />
                    <Button
                      soft
                      label="Community rules"
                      onPress={() => setModal('rules')}
                    />
                    <Text style={s.meta}>
                      Blocked members: {blocked.length} · Reports sent:{' '}
                      {reports.length}
                    </Text>
                    <Button
                      soft
                      label="Sign out"
                      onPress={async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) setNotice(error.message);
                      }}
                    />
                  </>
                )}
                {notice && (
                  <Text accessibilityLiveRegion="polite" style={s.meta}>
                    {notice}
                  </Text>
                )}
                <Text style={s.section}>Posts</Text>
                {posts
                  .filter((p) => p.author === (author?.name ?? 'You'))
                  .map(postCard)}
                {!author && !posts.some((p) => p.author === 'You') && (
                  <Text style={s.body}>Your posts will appear here.</Text>
                )}
              </>
            ) : tab === 'Feed' ? (
              <>
                <View style={s.hero}>
                  <Image source={require('../../assets/images/logo.jpg')} style={s.heroLogo} resizeMode="contain" />
                  <Text style={s.eyebrow}>MONTRÉAL</Text>
                  <Text style={s.heroTitle}>Around the block.</Text>
                </View>
                <View style={s.header}>
                  <Text style={s.section}>Neighbourhood feed</Text>
                  <Button
                    label="+ Post"
                    onPress={() => {
                      setPostArea(area ?? areas[0]);
                      setModal('post');
                    }}
                  />
                </View>
                {posts
                  .filter((p) => !blocked.includes(p.author) && inArea(p.area))
                  .map(postCard)}
                <Button
                  soft
                  label="Community help board ↗"
                  onPress={openHelp}
                />
              </>
            ) : tab === 'Discover' ? (
              <>
                <Text style={s.title}>Discover</Text>
                <Communities />
                <TextInput
                  accessibilityLabel="Search"
                  style={s.input}
                  placeholderTextColor={C.placeholder}
            placeholder="Search people, interests or posts"
                  value={query}
                  onChangeText={setQuery}
                />
                <Text style={s.section}>People</Text>
                {filteredPeople.map((p) => (
                  <Pressable
                    key={p.name}
                    accessibilityRole="button"
                    style={s.card}
                    onPress={() => profile(p.name)}
                  >
                    <Text style={s.cardTitle}>{p.name} ↗</Text>
                    <Text style={s.meta}>
                      {p.area} · {p.interest}
                    </Text>
                  </Pressable>
                ))}
                {!filteredPeople.length && (
                  <Text style={s.body}>No people match this search.</Text>
                )}
                <Text style={s.section}>Posts</Text>
                {filteredPosts.map(postCard)}
                {!filteredPosts.length && (
                  <Text style={s.body}>No matching posts.</Text>
                )}
              </>
            ) : (
              <>
                <Text style={s.title}>Inbox</Text>
                {Object.entries(threads)
                  .filter(([name]) => !blocked.includes(name))
                  .sort(
                    (a, b) =>
                      b[1][b[1].length - 1].id - a[1][a[1].length - 1].id,
                  )
                  .map(([name, list]) => (
                    <Pressable
                      accessibilityRole="button"
                      key={name}
                      style={s.card}
                      onPress={() => go({ kind: 'chat', name })}
                    >
                      <Text style={s.cardTitle}>{name} ↗</Text>
                      <Text numberOfLines={1} style={s.body}>
                        {list[list.length - 1].text}
                      </Text>
                    </Pressable>
                  ))}
              </>
            )}
          </ScrollView>
        )
      )}
      {!detail && (
        <View style={social.nav}>
          {['Feed', 'Discover', 'Services', 'Inbox', 'Me'].map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={[s.tab, t === tab && s.active]}
            >
              <Text style={[s.tabLabel, t === tab && { color: C.onPrimary }]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Modal
        visible={modal !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={s.scrim}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.sheet}>
            <ScrollView
              contentContainerStyle={s.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.header}>
                <Text style={s.brand}>          <Image source={require('../../assets/images/logo.jpg')} style={s.logoImg} resizeMode="contain" /> CouCouMTL</Text>
                <Button soft label="Close" onPress={close} />
              </View>
              {modal === 'location' ? (
                <>
                  <Text style={s.title}>Where in Montréal?</Text>
                  <Text style={s.body}>
                    Choose an area for your feed and discoveries.
                  </Text>
                  {areas.map((a) => (
                    <Button
                      key={a}
                      soft
                      label={a}
                      onPress={() => {
                        setArea(a);
                        close();
                      }}
                    />
                  ))}
                  <Button
                    label="Browse all Montréal"
                    onPress={() => {
                      setArea(null);
                      close();
                    }}
                  />
                </>
              ) : modal === 'post' ? (
                <>
                  <Text style={s.title}>Share a post</Text>
                  <TextInput
                    accessibilityLabel="Post text"
                    multiline
                    style={s.input}
                    placeholderTextColor={C.placeholder}
            placeholder="What’s happening nearby?"
                    value={postText}
                    onChangeText={setPostText}
                    maxLength={1200}
                  />
                  <View style={s.row}>
                    {areas.map((a) => (
                      <Button
                        label={a}
                        soft={a !== postArea}
                        key={a}
                        onPress={() => setPostArea(a)}
                      />
                    ))}
                  </View>
                  <Button
                    label="Publish"
                    disabled={!postText.trim()}
                    onPress={() => {
                      const p = {
                        id: nextId.current++,
                        author: 'You',
                        content: postText.trim(),
                        area: postArea,
                        topic: 'Community',
                        likes: 0,
                      };
                      setPosts((prev) => [p, ...prev]);
                      if (area) setArea(postArea);
                      setPostText('');
                      close();
                    }}
                  />
                </>
              ) : modal === 'rules' ? (
                <>
                  <Text style={s.title}>Community rules · v1.0</Text>
                  <Text style={s.body}>{RULES}</Text>
                  <Button
                    label={
                      rulesAccepted
                        ? 'Rules accepted'
                        : 'Agree to rules'
                    }
                    disabled={rulesAccepted}
                    onPress={() => {
                      setRulesAccepted(true);
                      close();
                    }}
                  />
                </>
              ) : modal === 'report' && author ? (
                <>
                  <Text style={s.title}>Report {author.name}</Text>
                  <Text style={s.body}>
                    Tell us what happened. A reason is required.
                  </Text>
                  <TextInput
                    style={s.input}
                    multiline
                    placeholderTextColor={C.placeholder}
            placeholder="Reason for report"
                    value={reportReason}
                    onChangeText={setReportReason}
                    maxLength={1000}
                  />
                  <Button
                    label="Submit report"
                    disabled={!reportReason.trim()}
                    onPress={() => {
                      if (!reportReason.trim()) return;
                      setReports((prev) => [
                        ...prev,
                        { name: author.name, reason: reportReason.trim() },
                      ]);
                      setNotice('Report recorded in this demo.');
                      close();
                    }}
                  />
                </>
              ) : modal === 'block' && author ? (
                <>
                  <Text style={s.title}>Block {author.name}?</Text>
                  <Text style={s.body}>
                    Their posts, profile and conversation will be hidden from
                    your account.
                  </Text>
                  <Button
                    label="Confirm block"
                    onPress={() => {
                      setBlocked((prev) => [
                        ...new Set([...prev, author.name]),
                      ]);
                      close();
                      setTrail([]);
                      setTab('Feed');
                    }}
                  />
                </>
              ) : (
                modal === 'edit' && (
                  <>
                    <Text style={s.title}>Edit bio</Text>
                    <TextInput
                      accessibilityLabel="Bio"
                      multiline
                      style={s.input}
                      value={bioDraft}
                      onChangeText={setBioDraft}
                      maxLength={500}
                    />
                    <Button
                      label={profileSaving ? 'Saving…' : 'Save'}
                      disabled={profileSaving}
                      onPress={async () => {
                        if (!currentUserId) {
                          setNotice('Could not find your signed-in profile.');
                          return;
                        }
                        setProfileSaving(true);
                        const nextBio = bioDraft.trim();
                        try {
                          const { error } = await supabase
                            .from('profiles')
                            .update({ bio: nextBio || null })
                            .eq('id', currentUserId);
                          if (error) throw error;
                          setBio(nextBio);
                          setCurrentProfile((profile) => ({
                            ...profile,
                            bio: nextBio || null,
                          }));
                          setNotice('Bio saved.');
                          close();
                        } catch (saveError) {
                          setNotice(
                            saveError instanceof Error
                              ? saveError.message
                              : 'Could not save your bio.',
                          );
                        } finally {
                          setProfileSaving(false);
                        }
                      }}
                    />
                  </>
                )
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
const useSocial = makeStyles((C) => ({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nav: {
    flexDirection: 'row',
    padding: 6,
    borderTopWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chatHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.yellow,
    padding: 16,
  },
  bubble: {
    backgroundColor: C.lilac,
    borderRadius: 18,
    padding: 14,
    alignSelf: 'flex-start',
    maxWidth: '83%',
  },
  mine: { alignSelf: 'flex-end', backgroundColor: C.yellow },
  bubbleText: { color: C.onAccent },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
}));
