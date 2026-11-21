import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
// Change the palette here to restyle the whole screen.
const C = {
  ink: '#20211C',
  yellow: '#FFDF46',
  lilac: '#D8C2F4',
  cream: '#FFFDF4',
  white: '#FFFFFF',
  muted: '#55574E',
};
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
      <Text style={[s.buttonText, soft && { color: C.ink }]}>{label}</Text>
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
    <View style={[s.card, { backgroundColor: C.cream }]}>
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
function CommunityBoard({ area, displayName, rulesAccepted, agree }) {
  const [userId, setUserId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requesterNames, setRequesterNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('companionship');
  const [editing, setEditing] = useState(false);

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

        const ids = [...new Set((rows ?? []).map((row) => row.requester_id))];
        let profiles = [];
        if (ids.length) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', ids);
          if (profileError) throw profileError;
          profiles = data ?? [];
        }

        if (active) {
          setUserId(user.id);
          setRequests(rows ?? []);
          setRequesterNames(
            Object.fromEntries(profiles.map((profile) => [profile.id, profile.display_name])),
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
        <Text accessibilityLiveRegion="polite" style={{ color: '#A43C32' }}>
          {error}
        </Text>
      )}
      {loading ? (
        <Text style={s.meta}>Loading help requests…</Text>
      ) : requests.length ? (
        requests.map((request) => (
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
          </View>
        ))
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
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
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
  brand: { fontSize: 23, letterSpacing: -1, fontWeight: '900', color: C.ink },
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
    color: '#F3BB25',
  },
  eyebrow: { color: C.ink, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  heroTitle: {
    color: C.ink,
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -2,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 26,
    backgroundColor: '#EEEEE4',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 22,
  },
  active: { backgroundColor: C.ink },
  tabLabel: {
    color: C.ink,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    fontSize: 23,
    color: C.ink,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DEDED1',
    gap: 10,
    backgroundColor: C.white,
  },
  title: { fontSize: 30, color: C.ink, fontWeight: '900', letterSpacing: -1 },
  cardTitle: {
    fontSize: 22,
    color: C.ink,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  body: { color: C.muted, fontSize: 16, lineHeight: 23 },
  meta: { color: C.muted, fontWeight: '700', fontSize: 13 },
  bold: { color: C.ink, fontWeight: '700' },
  button: {
    backgroundColor: C.ink,
    borderRadius: 18,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soft: { backgroundColor: '#F1E8FE' },
  buttonText: { color: C.white, fontSize: 15, fontWeight: '700' },
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
    backgroundColor: C.ink,
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
    color: C.ink,
  },
  stamp: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: C.cream,
    color: C.ink,
    padding: 6,
    fontWeight: '700',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(25,25,18,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: C.cream,
    borderTopWidth: 8,
    borderTopColor: C.yellow,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sheetBody: { padding: 20, gap: 13 },
  input: {
    color: C.ink,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#BDBEAF',
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
});
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

        if (active) {
          setCurrentUserId(user.id);
          setCurrentProfile(profileData);
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
          <Text style={s.brand}>☀ CoucouMTL</Text>
        )}
        <Button
          soft
          label={area ?? 'Montréal ▾'}
          onPress={() => setModal('location')}
        />
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
            <Text style={s.section}>{activeChat}</Text>
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
                <Text style={s.body}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={social.composer}>
            <TextInput
              accessibilityLabel="Message"
              style={[s.input, { flex: 1 }]}
              value={chatDrafts[activeChat] ?? ''}
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
                  <Text style={s.heroMark}>☀</Text>
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
          {['Feed', 'Discover', 'Inbox', 'Me'].map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={[s.tab, t === tab && s.active]}
            >
              <Text style={[s.tabLabel, t === tab && { color: C.white }]}>
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
                <Text style={s.brand}>☀ CoucouMTL</Text>
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
                      agreements.includes(1)
                        ? 'Rules accepted'
                        : 'Agree to rules'
                    }
                    disabled={agreements.includes(1)}
                    onPress={() => {
                      agree(1);
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
const social = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  nav: {
    flexDirection: 'row',
    padding: 6,
    borderTopWidth: 1,
    borderColor: '#DDDCD0',
    backgroundColor: C.white,
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
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
});
