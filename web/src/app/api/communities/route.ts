import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('communities')
            .select('community_id, name')
            .order('name');

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: 'Failed to fetch communities', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ communities: data });
    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
