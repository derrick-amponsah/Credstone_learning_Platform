'use client';
import CatalogueView from '@/components/CatalogueView';
export default function Page({ searchParams }: { searchParams: { q?: string } }) { return <CatalogueView initialQ={searchParams.q} />; }
