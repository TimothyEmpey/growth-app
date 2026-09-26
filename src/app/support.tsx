import { LegalDocument, type LegalSection } from '@/components/legal-document';

const sections: LegalSection[] = [
  {
    title: 'Contact',
    paragraphs: [
      'For app issues, account help, privacy requests, feedback, or feature suggestions, email tlegeneral@proton.me.',
      'Include the device type, app version, what you were trying to do, and the exact error message when possible. Do not send your password, verification code, or Strava access credentials.',
    ],
  },
  {
    title: 'Account access',
    paragraphs: [
      'Use Forgot password on the sign-in screen if you cannot access your account. Verification and recovery codes expire after 10 minutes and can be used only once.',
      'You can use lifting and diet journal features locally without an account. Account sign-in is required for cross-device synchronization and a personal Strava connection.',
    ],
  },
  {
    title: 'Delete an account',
    paragraphs: [
      'Open Account → Edit profile → Delete account. Confirm with the current password to permanently remove the Growth account, synchronized journal, sessions, Strava connection, and imported runs.',
      'If you cannot access the in-app deletion control, contact support from the account email address for assistance.',
    ],
  },
  {
    title: 'Strava help',
    paragraphs: [
      'Open Running → Link Strava to connect, refresh, or disconnect. An initial import can take time because Growth retrieves activity history in pages and respects Strava rate limits.',
      'Growth imports running, trail-running, and virtual-running activities. Other activity types are not included. Disconnecting removes imported Strava runs from Growth without changing activities in Strava.',
    ],
  },
  {
    title: 'Food and nutrition data',
    paragraphs: [
      'Typed food searches and serving nutrition come from FatSecret. Barcode lookups come from Open Food Facts. Some provider records may not include every nutrient; missing macro values count as zero.',
      'Growth is a personal journal and does not provide medical diagnosis or individualized medical advice. Contact a qualified professional for medical or dietary care.',
    ],
  },
  {
    title: 'Privacy',
    paragraphs: [
      'Read the Growth privacy policy at /privacy on the Growth website or open Privacy policy from the Account page in the app.',
    ],
  },
];

export default function SupportPage() {
  return (
    <LegalDocument
      title="Support"
      subtitle="Help with Growth, your account, and connected services."
      sections={sections}
    />
  );
}
