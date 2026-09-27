import { LegalDocument, type LegalSection } from '@/components/legal-document';

const sections: LegalSection[] = [
  {
    title: 'Overview',
    paragraphs: [
      'Growth is a personal fitness journal for lifting, running, nutrition, and body-weight records. You can use the local journal without creating an account. This policy explains what Growth handles when you use local features, create an account, synchronize a journal, search for foods, or connect Strava.',
      'Growth does not sell personal information, show advertising, or use your journal for cross-app tracking.',
    ],
  },
  {
    title: 'Information you provide',
    paragraphs: ['Growth may handle the following information when you choose to provide it:'],
    items: [
      'Account information, including your name, email address, password hash, and account-security records.',
      'Optional profile information, including gender, age, height, and body weight.',
      'Journal information, including weigh-ins, exercises, lifting records, foods, meals, nutrition values, goals, preferences, and saved food details.',
      'Support messages and the information you include when contacting Growth.',
    ],
  },
  {
    title: 'Local journals and account sync',
    paragraphs: [
      'Before you sign in, journal information is stored on your device or in your browser. If you create or sign in to a Growth account, the journal, profile, and preferences are transmitted over an encrypted connection and stored with your Growth account so they can synchronize across devices.',
      'Signing out removes that account’s synchronized journal from the device. Information you created only on a device remains subject to the device and browser storage controls available to you.',
    ],
  },
  {
    title: 'Strava',
    paragraphs: [
      'Connecting Strava is optional. If you connect it, Growth receives your Strava athlete identifier, athlete name, authorization scopes, access credentials, and running or hiking activities. Imported activity information may include titles, dates, distance, time, elevation, heart rate, and splits when Strava provides them.',
      'Growth uses this information to display your activity history, summaries, details, and activity streak. Provider credentials are encrypted at rest. Disconnecting Strava revokes the connection and removes its cached activities from Growth. Deleting your Growth account also revokes the Strava connection.',
    ],
  },
  {
    title: 'Apple Health',
    paragraphs: [
      'Connecting Apple Health is optional and available only in the iPhone app. Growth can read running workouts, walking and running distance, heart rate, and body-weight measurements after you approve access in Apple Health. Growth does not write data to Apple Health.',
      'Apple Health workouts are read directly on your iPhone and are not uploaded to the Growth service. When you choose to import body-weight history, the latest measurement for each day is copied into your Growth weight journal. Imported weights follow the same storage and optional account-sync behavior as weights you enter manually.',
      'Apple does not tell apps whether access to an individual Health category was denied. An empty result can therefore mean either that no matching records exist or that the category was not shared. You can review or revoke access in the Health app at any time.',
    ],
  },
  {
    title: 'Food search and email delivery',
    paragraphs: [
      'Typed food searches are sent through the Growth service to FatSecret. Barcode lookups are sent to Open Food Facts. Search terms and requested food or barcode identifiers are provided to the applicable food provider, but Growth does not send your Growth password or Strava credentials with those requests. Selected nutrition values are saved with journal entries so historical entries do not change when database results change.',
      'Growth uses Resend to deliver account-verification, password-recovery, and email-change messages. Resend receives the destination email address and message content needed to deliver those messages.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: ['Growth uses information only to operate and protect the service, including to:'],
    items: [
      'Provide journal, nutrition, running, account, synchronization, and preference features.',
      'Authenticate accounts, verify email addresses, recover passwords, and prevent abuse.',
      'Import and update runs after you authorize Strava.',
      'Respond to support requests and diagnose service failures.',
      'Comply with legal obligations and enforce service security.',
    ],
  },
  {
    title: 'Service providers',
    paragraphs: [
      'Growth relies on Cloudflare for application hosting, API processing, queues, and database storage; Strava for connected running information; FatSecret for typed food search and nutrition information; Open Food Facts for barcode information; and Resend for account email delivery. These providers process only the information needed for their role and operate under their own terms and privacy practices.',
    ],
  },
  {
    title: 'Retention, deletion, and choices',
    paragraphs: [
      'Growth keeps account and synchronized journal information while your account is active. Short-lived verification, OAuth, and session records expire automatically. Food lookup caches and operational records may be retained temporarily for reliability, security, and rate-limit protection.',
      'You can disconnect Strava from Account → Connections. You can permanently delete your Growth account from Account → Edit profile → Delete account. Account deletion removes the active account, synchronized journal, sessions, verification records, Strava connection, and cached runs. Infrastructure providers may retain limited residual records for their normal security, backup, or legal-retention periods.',
      'You can remove a local-only journal by deleting the app or clearing its browser storage. Contact Growth if you need help exercising a privacy choice.',
    ],
  },
  {
    title: 'Security and children',
    paragraphs: [
      'Growth uses encrypted network connections, hashed passwords and session credentials, encrypted Strava credentials, and access controls intended to protect account information. No system can guarantee absolute security.',
      'Growth is not directed to children under 13. Do not create an account or provide personal information if you are under the minimum age required in your country without the consent required by applicable law.',
    ],
  },
  {
    title: 'Policy updates and contact',
    paragraphs: [
      'This policy may be updated as Growth changes. The effective date below will change when a material revision is published.',
      'Questions or privacy requests: tlegeneral@proton.me',
      'Effective September 24, 2026.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy policy"
      subtitle="How Growth handles your journal and account information."
      sections={sections}
    />
  );
}
