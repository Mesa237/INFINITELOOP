import { supabase } from './supabase';
import { supabaseStorage } from './supabase-storage';

export type PortalType = 'member' | 'volunteer' | 'both';

const PORTAL_KEY = 'coucou_active_portal';

export function getActivePortal(): PortalType {
  const stored = supabaseStorage.getItem(PORTAL_KEY);
  if (stored === 'volunteer') return 'volunteer';
  if (stored === 'both') return 'both';
  return 'member';
}

export function setActivePortal(portal: PortalType): void {
  supabaseStorage.setItem(PORTAL_KEY, portal);
}

export interface PortalValidationResult {
  allowed: boolean;
  errorMessage?: string;
  userRole?: 'member' | 'volunteer' | 'both';
}

/**
 * Validates whether the authenticated user is allowed to access the specified portal.
 * An account can be: 'member', 'volunteer', or 'both'.
 * Users can only access the portal matching their registered role.
 */
export async function validatePortalAccess(
  userId: string,
  targetPortal: PortalType,
): Promise<PortalValidationResult> {
  let inVolunteers = false;
  let inMembers = false;
  let profileRole: string | null = null;

  try {
    const { data: vData } = await supabase
      .from('volunteers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    inVolunteers = Boolean(vData);
  } catch {
    inVolunteers = false;
  }

  try {
    const { data: mData } = await supabase
      .from('members')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    inMembers = Boolean(mData);
  } catch {
    inMembers = false;
  }

  try {
    const { data: pData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    profileRole = pData?.role ?? null;
  } catch {
    profileRole = null;
  }

  const isBoth = profileRole === 'both' || (inMembers && inVolunteers);
  const isMemberOnly = (inMembers || profileRole === 'seeker') && !isBoth && !inVolunteers && profileRole !== 'volunteer';
  const isVolunteerOnly = (inVolunteers || profileRole === 'volunteer') && !isBoth && !inMembers && profileRole !== 'seeker';

  // 1. If user is registered as BOTH
  if (isBoth) {
    // Both users have access to all portals
    return { allowed: true, userRole: 'both' };
  }

  // 2. If attempting to access the "Both" portal
  if (targetPortal === 'both') {
    if (isMemberOnly) {
      return {
        allowed: false,
        errorMessage:
          'This email is registered strictly as a Member. You can only sign in through the Member portal.',
        userRole: 'member',
      };
    }
    if (isVolunteerOnly) {
      return {
        allowed: false,
        errorMessage:
          'This email is registered strictly as a Volunteer. You can only sign in through the Volunteer portal.',
        userRole: 'volunteer',
      };
    }
    return { allowed: true, userRole: 'both' };
  }

  // 3. If attempting to access the Volunteer portal
  if (targetPortal === 'volunteer') {
    if (isMemberOnly) {
      return {
        allowed: false,
        errorMessage:
          'This email is registered as a Member. You cannot sign in as a Volunteer.',
        userRole: 'member',
      };
    }
    if (!isVolunteerOnly && !inVolunteers) {
      return {
        allowed: false,
        errorMessage:
          'This email does not have a Volunteer role. Please switch to the portal you registered with.',
        userRole: 'member',
      };
    }
    return { allowed: true, userRole: 'volunteer' };
  }

  // 4. If attempting to access the Member portal
  if (targetPortal === 'member') {
    if (isVolunteerOnly) {
      return {
        allowed: false,
        errorMessage:
          'This email is registered as a Volunteer. You cannot sign in as a Member.',
        userRole: 'volunteer',
      };
    }
    return { allowed: true, userRole: 'member' };
  }

  return { allowed: true, userRole: 'member' };
}
