'use client';
import AuthSplit from '@/components/AuthSplit';
import { Alert, Btn, Disc } from '@/components/ui';

export default function Pending({ searchParams }: { searchParams: { name?: string } }) {
  return (
    <AuthSplit headline={<>Thanks for signing up.<br />One step left.</>}>
      <Disc n="clock" size={64} />
      <div><h2 className="m-h1" style={{ fontSize: 34 }}>{searchParams.name ? `${searchParams.name}, your` : 'Your'} account is waiting for a role</h2>
        <div className="m-sub" style={{ marginTop: 6 }}>The platform administrator has been notified. They will give you a role, such as learner, supervisor or content instructor, and then you can sign in.</div></div>
      <Alert>You do not need to do anything else. If it takes more than a working day, contact your administrator.</Alert>
      <Btn href="/signin" kind="sec">Back to sign in</Btn>
    </AuthSplit>
  );
}
