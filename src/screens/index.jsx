import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import PublicServices from './public-services';
import {
  makeStyles,
  setThemeMode,
  THEME_MODES,
  useCoucouTheme,
} from '../theme/coucou';
import { setActivePortal } from '../../lib/portal';
const areas = ['Downtown', 'Le Plateau', 'Verdun'];
const samplePeople = [
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
// The app has no language setting yet; the post language defaults to English.
const APP_LANGUAGE = 'en';
const HELP_TYPES = [
  'appointments',
  'paperwork',
  'transportation',
  'companionship',
  'language_practice',
  'technology',
  'other',
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
function HelpOfferInbox({
  isActive,
  onOpenChat,
  onOpenRequest,
  onRefresh,
  reloadKey,
}) {
  const { C } = useCoucouTheme();
  const s = useS();
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [names, setNames] = useState({});
  const [requestTitles, setRequestTitles] = useState({});
  const [messageBodies, setMessageBodies] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (!isActive) return undefined;

    let active = true;
    let channel;

    async function loadNotifications() {
      setLoading(true);
      setError('');
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Please sign in to view your inbox.');

        const { data, error: notificationError } = await supabase
          .from('user_notifications')
          .select(
            'id, actor_id, help_request_id, match_id, message_id, notification_type, created_at, read_at',
          )
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (notificationError) throw notificationError;
        const rows = data ?? [];

        const { data: matchRows, error: matchesError } = await supabase
          .from('matches')
          .select('id, help_request_id, volunteer_id, status')
          .in('status', ['accepted', 'completed'])
          .order('updated_at', { ascending: false });
        if (matchesError) throw matchesError;
        const acceptedMatches = matchRows ?? [];
        const requestIds = [
          ...new Set([
            ...rows.map((item) => item.help_request_id),
            ...acceptedMatches.map((match) => match.help_request_id),
          ]),
        ];
        let profileRows = [];
        let requestRows = [];
        if (requestIds.length) {
          const { data: requests, error: requestsError } = await supabase
            .from('help_requests')
            .select('id, title, requester_id')
            .in('id', requestIds);
          if (requestsError) throw requestsError;
          requestRows = requests ?? [];
        }
        const profileIds = [
          ...new Set([
            ...rows.map((item) => item.actor_id),
            ...acceptedMatches.map((match) => match.volunteer_id),
            ...requestRows.map((request) => request.requester_id),
          ]),
        ];
        if (profileIds.length) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', profileIds);
          if (profilesError) throw profilesError;
          profileRows = profiles ?? [];
        }
        const messageIds = rows
          .map((item) => item.message_id)
          .filter(Boolean);
        let messageRows = [];
        if (messageIds.length) {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id, body')
            .in('id', messageIds);
          if (messagesError) throw messagesError;
          messageRows = messages ?? [];
        }
        const requestById = Object.fromEntries(
          requestRows.map((request) => [request.id, request]),
        );
        const profileById = Object.fromEntries(
          profileRows.map((profile) => [profile.id, profile]),
        );
        const activeChats = acceptedMatches
          .map((match) => {
            const request = requestById[match.help_request_id];
            if (!request) return null;
            const partnerId =
              match.volunteer_id === user.id
                ? request.requester_id
                : match.volunteer_id;
            const chatNotifications = rows.filter(
              (notification) => notification.match_id === match.id,
            );
            const latestNotification = chatNotifications[0];
            return {
              matchId: match.id,
              requestId: request.id,
              partnerName: profileById[partnerId]?.display_name || 'Neighbour',
              requestTitle: request.title,
              latestNotification,
              unreadCount: chatNotifications.filter((item) => !item.read_at).length,
            };
          })
          .filter(Boolean);

        if (active) {
          setNotifications(rows);
          setChats(activeChats);
          setNames(
            Object.fromEntries(
              profileRows.map((profile) => [profile.id, profile.display_name]),
            ),
          );
          setRequestTitles(
            Object.fromEntries(requestRows.map((request) => [request.id, request.title])),
          );
          setMessageBodies(
            Object.fromEntries(messageRows.map((message) => [message.id, message.body])),
          );
        }

        if (active) {
          channel = supabase
            .channel(`inbox-help-offers-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'user_notifications',
                filter: `recipient_id=eq.${user.id}`,
              },
              onRefresh,
            )
            .subscribe((status, subscriptionError) => {
              if (
                active &&
                (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
              ) {
                setError(
                  subscriptionError?.message ||
                    'Live inbox updates are unavailable. Refresh to check again.',
                );
              }
            });
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Could not load inbox notifications.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNotifications();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isActive, onRefresh, reloadKey]);

  async function markAsRead(notification) {
    if (notification.read_at || busyId) return;
    setBusyId(notification.id);
    setError('');
    try {
      const { data, error: updateError } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id)
        .select('id, read_at')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('This notification was not updated. Refresh and try again.');
      setNotifications((previous) =>
        previous.map((item) =>
          item.id === data.id ? { ...item, read_at: data.read_at } : item,
        ),
      );
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Could not mark notification as read.'));
    } finally {
      setBusyId('');
    }
  }

  async function openConversation(chat) {
    const unreadIds = notifications
      .filter(
        (notification) =>
          notification.match_id === chat.matchId && !notification.read_at,
      )
      .map((notification) => notification.id);

    if (unreadIds.length && !busyId) {
      setBusyId(chat.matchId);
      setError('');
      try {
        const readAt = new Date().toISOString();
        const { data, error: updateError } = await supabase
          .from('user_notifications')
          .update({ read_at: readAt })
          .in('id', unreadIds)
          .select('id');
        if (updateError) throw updateError;
        const readIds = new Set((data ?? []).map((item) => item.id));
        setNotifications((previous) =>
          previous.map((item) =>
            readIds.has(item.id) ? { ...item, read_at: readAt } : item,
          ),
        );
      } catch (updateError) {
        setError(
          getErrorMessage(updateError, 'Could not update conversation notifications.'),
        );
      } finally {
        setBusyId('');
      }
    }

    onOpenChat(chat.matchId, chat.partnerName);
  }

  return (
    <View style={s.card}>
      <Text style={s.section}>Inbox</Text>
      {loading && <Text style={s.meta}>Loading notifications…</Text>}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={{ color: C.error }}>
          {error}
        </Text>
      )}
      {!loading && !notifications.length && !chats.length && !error && (
        <Text style={s.body}>No notifications or accepted help conversations yet.</Text>
      )}
      {chats.length > 0 && (
        chats.map((chat) => (
          <View
            key={chat.matchId}
            style={[s.card, { backgroundColor: C.page }]}
          >
            <Text style={s.bold}>{chat.partnerName}</Text>
            <Text style={s.body}>{chat.requestTitle}</Text>
            {chat.latestNotification && (
              <Text numberOfLines={2} style={s.meta}>
                {chat.latestNotification.notification_type === 'message'
                  ? `${names[chat.latestNotification.actor_id] || 'Neighbour'}: ${messageBodies[chat.latestNotification.message_id] || 'New message'}`
                  : chat.latestNotification.notification_type === 'accepted'
                    ? 'Your help offer was accepted.'
                    : 'Help offer update'}
                {chat.unreadCount > 0 ? ` · ${chat.unreadCount} new` : ''}
              </Text>
            )}
            <Button
              soft
              label="View request"
              onPress={() => onOpenRequest(chat.requestId)}
            />
            <Button
              label={
                busyId === chat.matchId
                  ? 'Opening…'
                  : chat.unreadCount > 0
                    ? 'Open conversation'
                    : 'Continue conversation'
              }
              disabled={Boolean(busyId)}
              onPress={() => openConversation(chat)}
            />
          </View>
        ))
      )}
      {notifications
        .filter(
          (notification) =>
            notification.notification_type === 'offer' &&
            !chats.some((chat) => chat.matchId === notification.match_id),
        )
        .map((notification) => (
          <View
            key={notification.id}
            style={[s.card, { backgroundColor: C.page }]}
          >
            <Text style={s.body}>
              {names[notification.actor_id] || 'A volunteer'} offered to help with “
              {requestTitles[notification.help_request_id] || 'your request'}”.
            </Text>
            <Text style={s.meta}>
              {new Date(notification.created_at).toLocaleString()}
              {notification.read_at ? ' · Read' : ' · New'}
            </Text>
            <Button
              soft
              label="View request"
              onPress={() => onOpenRequest(notification.help_request_id)}
            />
            {!notification.read_at && (
              <Button
                soft
                label={busyId === notification.id ? 'Saving…' : 'Mark as read'}
                disabled={Boolean(busyId)}
                onPress={() => markAsRead(notification)}
              />
            )
            }
          </View>
        ))}
    </View>
  );
}
// ---- Meet: meeting proposals inside a match chat ----
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
const MEET_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
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
const MEET_OPTION_LABELS = {
  member: 'Member’s location',
  midpoint: 'Fair midpoint',
  volunteer: 'Volunteer’s chosen place',
};
const PROPOSAL_FIELDS =
  'id, match_id, proposed_by, option, place_name, public_place_id, lat, lng, meet_at, status, created_at';
const byCreatedAt = (a, b) => new Date(a.created_at) - new Date(b.created_at);
function upsertProposal(list, row) {
  const i = list.findIndex((item) => item.id === row.id);
  if (i === -1) return [...list, row].sort(byCreatedAt);
  const next = list.slice();
  next[i] = { ...next[i], ...row };
  return next;
}
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

function MeetPanel({ matchId, userId, isVolunteer, onProposed }) {
  const { C } = useCoucouTheme();
  const s = useS();
  const [option, setOption] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [pickedPlace, setPickedPlace] = useState(null);
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const days = nextDays();

  const options = isVolunteer ? ['midpoint', 'volunteer'] : ['member', 'midpoint'];
  const optionLabels = isVolunteer
    ? ['Fair midpoint', 'My chosen place']
    : ['My location', 'Fair midpoint'];

  async function chooseOption(next) {
    setOption(next);
    setError('');
    setPickedPlace(null);
    if (next !== 'midpoint') return;
    setPlacesLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('suggest_meeting_places', {
        target_match_id: matchId,
      });
      if (rpcError) throw rpcError;
      setPlaces(data ?? []);
    } catch {
      setPlaces([]);
      setError('Could not find meeting places right now. Try again, or choose a place yourself.');
    } finally {
      setPlacesLoading(false);
    }
  }

  async function send() {
    const chosenDay = days.find((d) => d.key === day);
    if (!userId || !chosenDay || hour === '') return;
    const meetAt = new Date(chosenDay.date);
    meetAt.setHours(Number(hour), 0, 0, 0);
    const row = {
      match_id: matchId,
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
    setBusy(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('meeting_proposals')
        .insert(row)
        .select(PROPOSAL_FIELDS)
        .single();
      if (insertError) throw insertError;
      onProposed(data);
    } catch {
      setError("Your proposal wasn't sent. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const placeReady =
    option === 'midpoint' ? !!pickedPlace : placeName.trim().length >= 2;
  const canSend = !!option && placeReady && !!day && hour !== '' && !busy;

  return (
    <View style={[s.card, { backgroundColor: C.page }]}>
      <Text style={s.section}>Where should you meet?</Text>
      <Choices
        title="Choose an option"
        values={options}
        labels={optionLabels}
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
            const mine = isVolunteer ? place.volunteer_km : place.member_km;
            const theirs = isVolunteer ? place.member_km : place.volunteer_km;
            const picked = pickedPlace?.place_id === place.place_id;
            return (
              <Pressable
                key={place.place_id}
                accessibilityRole="button"
                accessibilityState={{ selected: picked }}
                onPress={() => setPickedPlace(place)}
                style={[
                  s.card,
                  picked && { borderColor: C.primary, borderWidth: 2 },
                ]}
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
            values={MEET_HOURS.map(String)}
            labels={MEET_HOURS.map(hourLabel)}
            value={hour}
            change={setHour}
          />
          <Button
            label={busy ? 'Sending…' : 'Send proposal'}
            disabled={!canSend}
            onPress={send}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={{ color: C.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}

function ProposalCard({ proposal, userId, partnerName, busy, onAnswer }) {
  const { C } = useCoucouTheme();
  const s = useS();
  const mine = proposal.proposed_by === userId;
  return (
    <View style={[s.card, { borderColor: C.yellow, borderWidth: 2 }]}>
      <Text style={s.meta}>
        {MEET_OPTION_LABELS[proposal.option] ?? 'Meeting'} ·{' '}
        {mine ? 'You proposed' : partnerName + ' proposed'} ·{' '}
        {proposal.status.toUpperCase()}
      </Text>
      <Text style={s.cardTitle}>{proposal.place_name}</Text>
      <Text style={s.body}>{formatMeetAt(proposal.meet_at)}</Text>
      {proposal.status === 'proposed' &&
        (mine ? (
          <Button
            soft
            label="Cancel"
            disabled={busy}
            onPress={() => onAnswer(proposal, 'cancelled')}
          />
        ) : (
          <View style={s.row}>
            <Button
              label="Accept"
              disabled={busy}
              onPress={() => onAnswer(proposal, 'accepted')}
            />
            <Button
              soft
              label="Decline"
              disabled={busy}
              onPress={() => onAnswer(proposal, 'declined')}
            />
          </View>
        ))}
      {proposal.status === 'accepted' && (
        <Button
          label="Open in Maps"
          onPress={() => Linking.openURL(mapsUrl(proposal))}
        />
      )}
    </View>
  );
}

function MatchConversation({ matchId, partnerName }) {
  const { C } = useCoucouTheme();
  const s = useS();
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetError, setMeetError] = useState('');
  const [busyProposal, setBusyProposal] = useState('');

  // Meet: who is who in this match, plus live meeting proposals.
  useEffect(() => {
    let active = true;
    async function loadMeet() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const [{ data: match }, { data: rows, error: proposalError }] =
          await Promise.all([
            supabase.from('matches').select('volunteer_id').eq('id', matchId).maybeSingle(),
            supabase
              .from('meeting_proposals')
              .select(PROPOSAL_FIELDS)
              .eq('match_id', matchId)
              .order('created_at', { ascending: true }),
          ]);
        if (proposalError) throw proposalError;
        if (active) {
          setIsVolunteer(!!user && match?.volunteer_id === user.id);
          setProposals(rows ?? []);
        }
      } catch {
        if (active) setMeetError('Meeting proposals could not be loaded right now.');
      }
    }
    loadMeet();
    const channel = supabase
      .channel(`match-meetings-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_proposals',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.new?.id) {
            setProposals((previous) => upsertProposal(previous, payload.new));
          }
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  async function answerProposal(proposal, status) {
    setBusyProposal(proposal.id);
    setMeetError('');
    try {
      const { data, error: updateError } = await supabase
        .from('meeting_proposals')
        .update({ status })
        .eq('id', proposal.id)
        .select('id, status')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('Not updated');
      setProposals((previous) => upsertProposal(previous, data));
    } catch {
      setMeetError('Could not update this proposal. Try again.');
    } finally {
      setBusyProposal('');
    }
  }

  const timeline = [
    ...messages,
    ...proposals.map((proposal) => ({ ...proposal, kind: 'proposal' })),
  ].sort(byCreatedAt);

  useEffect(() => {
    let active = true;
    let channel;

    async function loadMessages() {
      setLoading(true);
      setError('');
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Please sign in to view this conversation.');

        const { data, error: messagesError } = await supabase
          .from('messages')
          .select('id, sender_id, body, created_at')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;

        if (active) {
          setUserId(user.id);
          setMessages(data ?? []);
          channel = supabase
            .channel(`match-messages-${matchId}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `match_id=eq.${matchId}`,
              },
              () => setReloadKey((key) => key + 1),
            )
            .subscribe((status, subscriptionError) => {
              if (
                active &&
                (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
              ) {
                setError(
                  subscriptionError?.message ||
                    'Live messages are unavailable. Refresh to check again.',
                );
              }
            });
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Could not load this conversation.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMessages();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [matchId, reloadKey]);

  async function sendMessage() {
    const body = draft.trim();
    if (!userId || !body || sending) return;
    setSending(true);
    setError('');
    try {
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({ match_id: matchId, sender_id: userId, body })
        .select('id, sender_id, body, created_at')
        .single();
      if (sendError) throw sendError;
      setMessages((previous) =>
        previous.some((item) => item.id === data.id) ? previous : [...previous, data],
      );
      setDraft('');
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Could not send your message.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.title}>{partnerName}</Text>
          <Button
            soft={meetOpen}
            label={meetOpen ? 'Close' : 'Meet'}
            disabled={!userId}
            onPress={() => setMeetOpen(!meetOpen)}
          />
        </View>
        {meetOpen && (
          <MeetPanel
            matchId={matchId}
            userId={userId}
            isVolunteer={isVolunteer}
            onProposed={(row) => {
              setProposals((previous) => upsertProposal(previous, row));
              setMeetOpen(false);
            }}
          />
        )}
        {!!meetError && (
          <Text accessibilityLiveRegion="polite" style={{ color: C.error }}>
            {meetError}
          </Text>
        )}
        {loading && <Text style={s.meta}>Loading conversation…</Text>}
        {!!error && (
          <Text accessibilityLiveRegion="polite" style={{ color: C.error }}>
            {error}
          </Text>
        )}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.content}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {!loading && messages.length === 0 && (
            <Text style={s.body}>No messages yet. Send a message to get started.</Text>
          )}
          {timeline.map((message) =>
            message.kind === 'proposal' ? (
              <ProposalCard
                key={'proposal-' + message.id}
                proposal={message}
                userId={userId}
                partnerName={partnerName}
                busy={busyProposal === message.id}
                onAnswer={answerProposal}
              />
            ) : (
            <View
              key={message.id}
              style={[
                s.card,
                {
                  alignSelf: message.sender_id === userId ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  backgroundColor:
                    message.sender_id === userId ? C.softBg : C.card,
                },
              ]}
            >
              <Text style={s.body}>{message.body}</Text>
              <Text style={s.meta}>
                {new Date(message.created_at).toLocaleString()}
              </Text>
            </View>
            ),
          )}
        </ScrollView>
        <View style={s.row}>
          <TextInput
            accessibilityLabel="Write a message"
            style={[s.input, { flex: 1 }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            placeholderTextColor={C.placeholder}
            maxLength={2000}
          />
          <Button
            label={sending ? 'Sending…' : 'Send'}
            disabled={!draft.trim() || sending || !userId}
            onPress={sendMessage}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
function CommunityBoard({
  isActive,
  area,
  displayName,
  role,
  requestId,
  openMatchChat,
  rulesAccepted,
  agree,
}) {
  const { C } = useCoucouTheme();
  const s = useS();
  const [userId, setUserId] = useState(null);
  const [loadedRole, setLoadedRole] = useState(null);
  const userRole = role ?? loadedRole;
  const [requests, setRequests] = useState([]);
  const [requesterNames, setRequesterNames] = useState({});
  const [requesterRoles, setRequesterRoles] = useState({});
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // AI post assistant (supabase/functions/draft-request).
  const [aiText, setAiText] = useState('');
  const [postLanguage, setPostLanguage] = useState(APP_LANGUAGE === 'fr' ? 'fr' : 'en');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiUrgent, setAiUrgent] = useState(false);
  const [aiHints, setAiHints] = useState([]);
  const [neededSkills, setNeededSkills] = useState([]);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [stars, setStars] = useState('');
  const [reviewReason, setReviewReason] = useState('');

  useEffect(() => {
    if (!isActive) return undefined;

    let isMounted = true;

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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        if (!['seeker', 'volunteer', 'both'].includes(profile.role)) {
          throw new Error('Your account does not have a valid community role.');
        }

        let requestQuery = supabase
          .from('help_requests')
          .select(
            'id, requester_id, title, description, help_type, neighborhood, status, created_at',
          );
        if (profile.role === 'seeker') {
          requestQuery = requestQuery.eq('requester_id', user.id);
        } else if (profile.role === 'volunteer' && !requestId) {
          requestQuery = requestQuery.eq('status', 'open');
        }
        if (requestId) {
          requestQuery = requestQuery.eq('id', requestId);
        }
        const { data: rows, error: requestError } = await requestQuery.order(
          'created_at',
          { ascending: false },
        );
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
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, role')
            .in('id', profileIds);
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

        if (isMounted) {
          setUserId(user.id);
          setLoadedRole(profile.role);
          setRequests(requestRows);
          setMatches(matchRows);
          setReviews(reviewRows);
          setRatingsByProfile(
            Object.fromEntries(ratingPairs.filter((pair) => pair !== null)),
          );
          setRequesterNames(
            Object.fromEntries(profiles.map((profile) => [profile.id, profile.display_name])),
          );
          setRequesterRoles(
            Object.fromEntries(profiles.map((profile) => [profile.id, profile.role])),
          );
        }

      } catch (loadError) {
        if (isMounted) {
          setError(
            getErrorMessage(loadError, 'Could not load help requests. Try again.'),
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRequests();
    return () => {
      isMounted = false;
    };
  }, [isActive, reloadKey, requestId, role]);

  async function writeDraft() {
    const text = aiText.trim();
    if (!text || aiBusy) return;
    setAiBusy(true);
    setAiError('');
    setAiUrgent(false);
    setAiHints([]);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'draft-request',
        { body: { text, postLanguage } },
      );
      const draft = data?.draft;
      if (invokeError || data?.error || !draft) throw invokeError ?? new Error('No draft');

      if (draft.urgent === true) {
        setAiUrgent(true);
        return;
      }
      if (draft.title) setTitle(String(draft.title).slice(0, 120));
      if (HELP_TYPES.includes(draft.help_type)) setCategory(draft.help_type);
      if (draft.description) setDescription(String(draft.description).slice(0, 2000));
      setAiHints(
        Array.isArray(draft.missing_info) ? draft.missing_info.slice(0, 2) : [],
      );
      setNeededSkills(Array.isArray(draft.needed_skills) ? draft.needed_skills : []);
      setDetectedLanguage(draft.detected_language || null);
    } catch {
      setAiError(
        "The assistant isn't available right now. You can write your post yourself.",
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function publishRequest() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const neighborhood = (area || 'Montréal').trim();

    if (!userId || !['seeker', 'both'].includes(userRole)) {
      setError('Only members and people with both roles can post requests.');
      return;
    }

    if (
      cleanTitle.length < 5 ||
      cleanDescription.length < 10 ||
      !neighborhood
    ) {
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
          needed_skills: neededSkills ?? [],
          preferred_language: detectedLanguage || null,
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
      setAiText('');
      setAiError('');
      setAiUrgent(false);
      setAiHints([]);
      setNeededSkills([]);
      setDetectedLanguage(null);
      setEditing(false);
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
          'Could not publish your request. Try again.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function offerToHelp(requestId) {
    if (
      !userId ||
      !['volunteer', 'both'].includes(userRole) ||
      !rulesAccepted
    ) {
      return;
    }
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

  async function deleteRequest(request) {
    if (
      request.requester_id !== userId ||
      request.status !== 'open' ||
      busyAction
    ) {
      return;
    }

    setBusyAction(request.id + ':delete');
    setError('');
    try {
      const { data, error: deleteError } = await supabase
        .from('help_requests')
        .delete()
        .eq('id', request.id)
        .select('id')
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!data) throw new Error('This request was not deleted. Refresh and try again.');
      setRequests((previous) =>
        previous.filter((item) => item.id !== request.id),
      );
      setMatches((previous) =>
        previous.filter((match) => match.help_request_id !== request.id),
      );
      setReviews((previous) =>
        previous.filter((review) => review.help_request_id !== request.id),
      );
      setConfirmDeleteId(null);
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError, 'Could not delete your request. Try again.'),
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

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Community help</Text>
      {userRole && (
        <Text style={s.body}>
          {userRole === 'seeker'
            ? 'Your requests and volunteer offers are shown here.'
            : userRole === 'volunteer'
              ? 'Browse open requests and offer help. Volunteers cannot post requests.'
              : 'Post your own requests and offer help on open requests.'}
        </Text>
      )}
      <View style={s.card}>
        <Text style={s.section}>Community rules · v1.0</Text>
        <Text style={s.body}>{RULES}</Text>
        <Button
          label={rulesAccepted ? 'Rules accepted' : 'Agree to rules'}
          disabled={rulesAccepted}
          onPress={agree}
        />
      </View>
      {['seeker', 'both'].includes(userRole) && (
        <Button
          label={editing ? 'Cancel request' : 'Post a request'}
          disabled={!rulesAccepted}
          onPress={() => {
            setError('');
            setEditing(!editing);
          }}
        />
      )}
      {editing && ['seeker', 'both'].includes(userRole) && (
        <View style={s.card}>
          <Text style={s.bold}>Describe what you need, in any language</Text>
          <TextInput
            accessibilityLabel="Describe what you need, in any language"
            style={s.input}
            multiline
            placeholderTextColor={C.placeholder}
            placeholder="Write it the way you would say it"
            value={aiText}
            onChangeText={setAiText}
            maxLength={3000}
          />
          <Choices
            title="Post language"
            values={['en', 'fr']}
            labels={['English', 'Français']}
            value={postLanguage}
            change={setPostLanguage}
          />
          <Button
            label={aiBusy ? 'Writing…' : 'Write my post'}
            disabled={aiBusy || !aiText.trim()}
            onPress={writeDraft}
          />
          {!!aiError && (
            <Text accessibilityLiveRegion="polite" style={s.meta}>
              {aiError}
            </Text>
          )}
          {aiUrgent && (
            <View accessibilityLiveRegion="assertive" style={[s.card, s.urgentCard]}>
              <Text style={[s.bold, s.urgentText]}>
                This sounds urgent. Call 911 now, or 811 for health advice.
              </Text>
              <View style={s.row}>
                <Button label="Call 911" onPress={() => Linking.openURL('tel:911')} />
                <Button label="Call 811" onPress={() => Linking.openURL('tel:811')} />
              </View>
            </View>
          )}
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
          {aiHints.map((hint) => (
            <Text key={hint} style={s.meta}>
              Tip: {hint}
            </Text>
          ))}
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
            request.requester_id === userId &&
            ['seeker', 'both'].includes(userRole)
              ? requestMatches.filter(
                  (match) =>
                    match.status === 'pending' &&
                    ['volunteer', 'both'].includes(
                      requesterRoles[match.volunteer_id],
                    ),
                )
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

              {request.requester_id === userId &&
                request.status === 'open' && (
                  confirmDeleteId === request.id ? (
                    <View>
                      <Text style={s.meta}>
                        Delete this request and its related offers? This cannot be undone.
                      </Text>
                      <Button
                        label={
                          busyAction === request.id + ':delete'
                            ? 'Deleting…'
                            : 'Confirm delete'
                        }
                        disabled={Boolean(busyAction)}
                        onPress={() => deleteRequest(request)}
                      />
                      <Button
                        soft
                        label="Keep request"
                        disabled={Boolean(busyAction)}
                        onPress={() => setConfirmDeleteId(null)}
                      />
                    </View>
                  ) : (
                    <Button
                      soft
                      label="Delete my request"
                      disabled={Boolean(busyAction)}
                      onPress={() => setConfirmDeleteId(request.id)}
                    />
                  )
                )}

              {['volunteer', 'both'].includes(userRole) &&
                request.requester_id !== userId &&
                request.status === 'open' &&
                !myOffer && (
                  <>
                    {!rulesAccepted && (
                      <Text style={s.meta}>
                        Agree to the community rules above to offer help.
                      </Text>
                    )}
                    <Button
                      label={
                        busyAction === request.id + ':offer'
                          ? 'Sending offer…'
                          : 'Offer to help'
                      }
                      disabled={Boolean(busyAction) || !rulesAccepted}
                      onPress={() => offerToHelp(request.id)}
                    />
                  </>
                )}

              {myOffer?.status === 'pending' &&
                request.requester_id !== userId && (
                  <>
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
                  <Text style={s.bold}>
                    Volunteer: {requesterNames[acceptedMatch.volunteer_id] || 'Neighbour'}
                  </Text>
                  <Button
                    soft
                    label="Open conversation"
                    onPress={() =>
                      openMatchChat(
                        acceptedMatch.id,
                        request.requester_id === userId
                          ? requesterNames[acceptedMatch.volunteer_id] || 'Volunteer'
                          : requesterNames[request.requester_id] || 'Neighbour',
                      )
                    }
                  />
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
      ) : error ? null : (
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
  urgentCard: { backgroundColor: C.invertBg, borderColor: C.invertBg },
  urgentText: { color: C.invertText },
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
  profilePicture: {
    width: 170,
    height: 170,
    borderRadius: 85,
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
function getErrorMessage(error, fallback) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') {
      const details =
        'details' in error && typeof error.details === 'string'
          ? error.details
          : '';
      const hint =
        'hint' in error && typeof error.hint === 'string' ? error.hint : '';
      return [message, details, hint].filter(Boolean).join(' ');
    }
  }
  return fallback;
}
export default function CoucouSocial() {
  const { C, mode: themeMode } = useCoucouTheme();
  const s = useS();
  const social = useSocial();
  const [tab, setTab] = useState('Feed');
  const [inboxReloadKey, setInboxReloadKey] = useState(0);
  const refreshInbox = useCallback(
    () => setInboxReloadKey((key) => key + 1),
    [],
  );
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
  const [people, setPeople] = useState(samplePeople);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState('');
  const [likes, setLikes] = useState([]);
  const [query, setQuery] = useState('');
  const [postText, setPostText] = useState('');
  const [postArea, setPostArea] = useState('Downtown');
  const [bio, setBio] = useState('');
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileRating, setProfileRating] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [pictureSaving, setPictureSaving] = useState(false);

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
          .select('id, display_name, role, languages, neighborhood, bio, avatar_url')
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
            .select('id, display_name, role, languages, neighborhood, bio, avatar_url')
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
  useEffect(() => {
    if (!currentUserId) return undefined;

    let active = true;
    async function loadDiscoverPeople() {
      setPeopleLoading(true);
      setPeopleError('');
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, role, languages, neighborhood, bio')
          .in('role', ['volunteer', 'both'])
          .neq('id', currentUserId)
          .order('display_name');
        if (profilesError) throw profilesError;

        if (active) {
          const discoverProfiles = (profiles ?? []).map((profile) => ({
            id: profile.id,
            name: profile.display_name,
            initials: profile.display_name
              .split(/\s+/)
              .map((part) => part[0] ?? '')
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            area: profile.neighborhood || 'Montréal',
            role:
              profile.role === 'both' ? 'Member & volunteer' : 'Volunteer',
            languages: profile.languages.join(' · '),
            interest: profile.role === 'both' ? 'Member & volunteer' : 'Volunteer',
            bio: profile.bio ?? '',
          }));
          const profileNames = new Set(
            discoverProfiles.map((profile) => profile.name.toLowerCase()),
          );
          setPeople([
            ...samplePeople.filter(
              (person) => !profileNames.has(person.name.toLowerCase()),
            ),
            ...discoverProfiles,
          ]);
        }
      } catch (loadError) {
        if (active) {
          setPeopleError(
            getErrorMessage(loadError, 'Could not load volunteers. Try again.'),
          );
        }
      } finally {
        if (active) setPeopleLoading(false);
      }
    }

    loadDiscoverPeople();
    return () => {
      active = false;
    };
  }, [currentUserId]);
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
  async function changeRole(role) {
    if (!currentUserId || roleSaving) return;

    setRoleSaving(true);
    setNotice('');
    try {
      const { error: roleError } = await supabase.rpc('change_my_role', {
        target_role: role,
      });
      if (roleError) throw roleError;

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, role, languages, neighborhood, bio, avatar_url')
        .eq('id', currentUserId)
        .single();
      if (profileError) throw profileError;
      if (updatedProfile.role !== role) {
        throw new Error('The saved role did not match the selected role.');
      }
      setCurrentProfile(updatedProfile);
      setActivePortal(role === 'seeker' ? 'member' : role);
      setNotice('Your role was saved to your account.');
      close();
    } catch (roleError) {
      const errorMessage =
        roleError instanceof Error
          ? roleError.message
          : typeof roleError === 'object' &&
              roleError !== null &&
              'message' in roleError &&
              typeof roleError.message === 'string'
            ? roleError.message
            : 'Could not update your role.';
      setNotice(
        errorMessage,
      );
    } finally {
      setRoleSaving(false);
    }
  }
  async function changeProfilePicture() {
    if (!currentUserId || pictureSaving) return;

    setPictureSaving(true);
    setNotice('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled) return;

      const image = result.assets[0];
      if (!image?.base64) {
        throw new Error('The selected photo could not be read. Please try another photo.');
      }

      const mimeType = image.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Choose a JPEG, PNG, or WebP image.');
      }

      if (image.base64.length > (5 * 1024 * 1024 * 4) / 3 + 4) {
        throw new Error('Choose a photo smaller than 5 MB.');
      }
      const binary = atob(image.base64);
      if (binary.length > 5 * 1024 * 1024) {
        throw new Error('Choose a photo smaller than 5 MB.');
      }
      const imageData = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        imageData[index] = binary.charCodeAt(index);
      }

      const filePath = `${currentUserId}/profile-picture`;
      const { error: uploadError } = await supabase.storage
        .from('coucou-profile-pictures')
        .upload(filePath, imageData, {
          cacheControl: '3600',
          contentType: mimeType,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('coucou-profile-pictures')
        .getPublicUrl(filePath);
      const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUserId)
        .select('id, display_name, role, languages, neighborhood, bio, avatar_url')
        .single();
      if (profileError) throw profileError;

      setCurrentProfile(updatedProfile);
      setNotice('Profile picture updated.');
    } catch (pictureError) {
      setNotice(
        pictureError instanceof Error
          ? pictureError.message
          : 'Could not update your profile picture.',
      );
    } finally {
      setPictureSaving(false);
    }
  }
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
  const activeChat =
    detail?.kind === 'chat' || detail?.kind === 'match-chat'
      ? detail.name
      : null;
  const openHelp = (requestId) => {
    setVisitedHelp(true);
    go({ kind: 'help', requestId });
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
            isActive={detail?.kind === 'help'}
            area={area}
            displayName={currentProfile?.display_name}
            role={currentProfile?.role}
            requestId={detail?.requestId}
            openMatchChat={(matchId, name) =>
              go({ kind: 'match-chat', matchId, name })
            }
            rulesAccepted={rulesAccepted}
            agree={() => setRulesAccepted(true)}
          />
        </View>
      )}
      {detail?.kind === 'match-chat' ? (
        <MatchConversation
          matchId={detail.matchId}
          partnerName={detail.name}
        />
      ) : activeChat ? (
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
                  {!author && currentProfile?.avatar_url ? (
                    <Image
                      source={{ uri: currentProfile.avatar_url }}
                      style={s.profilePicture}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      <View style={s.orbit} />
                      <View style={s.sun}>
                        <Text style={s.monogram}>{author?.initials ?? 'ME'}</Text>
                      </View>
                    </>
                  )}
                </View>
                {!author && (
                  <Button
                    soft
                    disabled={pictureSaving}
                    label={pictureSaving ? 'Updating photo…' : 'Change profile picture'}
                    onPress={changeProfilePicture}
                  />
                )}
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
                  <Button
                    soft
                    label="Edit bio"
                    onPress={() => {
                      setBioDraft(bio);
                      setModal('edit');
                    }}
                  />
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
                    <Button
                      soft
                      label="Change role"
                      onPress={() => setModal('role')}
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
                {!author && (
                  <Text style={[s.meta, { color: '#C62828' }]}>
                    Blocked members: {blocked.length} · Reports sent:{' '}
                    {reports.length}
                  </Text>
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
                <Text style={s.meta}>Volunteers and people with both roles</Text>
                {peopleError ? (
                  <Text style={[s.body, { color: '#C62828' }]}>{peopleError}</Text>
                ) : peopleLoading ? (
                  <Text style={s.meta}>Loading volunteers…</Text>
                ) : null}
                {filteredPeople.map((p) => (
                  <Pressable
                    key={p.id || p.name}
                    accessibilityRole="button"
                    style={s.card}
                    onPress={() => profile(p.name)}
                  >
                    <Text style={s.cardTitle}>{p.name} ↗</Text>
                    <Text style={s.meta}>
                      {p.area} · {p.role}
                    </Text>
                  </Pressable>
                ))}
                {!filteredPeople.length && !peopleLoading && !peopleError && (
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
                <HelpOfferInbox
                  isActive={!detail && tab === 'Inbox'}
                  onOpenChat={(matchId, name) =>
                    go({ kind: 'match-chat', matchId, name })
                  }
                  onOpenRequest={(requestId) => openHelp(requestId)}
                  onRefresh={refreshInbox}
                  reloadKey={inboxReloadKey}
                />
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
                <Button
                  soft
                  label="Refresh inbox"
                  onPress={refreshInbox}
                />
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
              ) : modal === 'role' ? (
                <>
                  <Text style={s.title}>Change your role</Text>
                  <Text style={s.body}>
                    Your choice is saved to your profile and membership records.
                  </Text>
                  {[
                    { value: 'seeker', label: 'Member' },
                    { value: 'volunteer', label: 'Volunteer' },
                    { value: 'both', label: 'Both' },
                  ].map((role) => (
                    <Button
                      key={role.value}
                      soft={currentProfile?.role !== role.value}
                      label={
                        roleSaving
                          ? 'Saving…'
                          : currentProfile?.role === role.value
                            ? `${role.label} · Current`
                            : role.label
                      }
                      disabled={roleSaving || currentProfile?.role === role.value}
                      onPress={() => changeRole(role.value)}
                    />
                  ))}
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
