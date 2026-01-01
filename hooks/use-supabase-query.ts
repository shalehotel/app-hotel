'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseSupabaseQueryOptions<T> {
    table: string
    select?: string
    filter?: {
        column: string
        operator: string
        value: any
    }
    orderBy?: {
        column: string
        ascending?: boolean
    }
    limit?: number
    realtime?: boolean
}

export function useSupabaseQuery<T>({
    table,
    select = '*',
    filter,
    orderBy,
    limit,
    realtime = false,
}: UseSupabaseQueryOptions<T>) {
    const [data, setData] = useState<T[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const supabase = createClient()

    useEffect(() => {
        let channel: RealtimeChannel | null = null

        const fetchData = async () => {
            try {
                let query = supabase.from(table).select(select)

                if (filter) {
                    query = query.filter(filter.column, filter.operator, filter.value)
                }

                if (orderBy) {
                    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
                }

                if (limit) {
                    query = query.limit(limit)
                }

                const { data, error } = await query

                if (error) throw error

                setData(data as T[])
                setError(null)
            } catch (err) {
                setError(err instanceof Error ? err : new Error('An error occurred'))
            } finally {
                setLoading(false)
            }
        }

        fetchData()

        if (realtime) {
            channel = supabase
                .channel(`${table}_changes`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: table,
                    },
                    () => {
                        fetchData()
                    }
                )
                .subscribe()
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [table, select, JSON.stringify(filter), JSON.stringify(orderBy), limit, realtime])

    return { data, loading, error, refetch: () => setLoading(true) }
}
