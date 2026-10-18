'use client';
import Shell from '@/components/Shell';
import { Btn, Empty } from '@/components/ui';

export default function Soon({ params }: { params: { name: string } }) {
  return <Shell><Empty icon="clock" title={`${params.name[0].toUpperCase() + params.name.slice(1)} is planned for a later phase`} text="This area is in the plan but not in the first release." action={<Btn href="/">Back home</Btn>} /></Shell>;
}
