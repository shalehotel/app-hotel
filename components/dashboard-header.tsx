'use client'

import React from 'react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { WidgetCajaActiva } from './cajas/widget-caja-activa'
import { useCheckTurno } from '@/hooks/use-check-turno'

interface DashboardHeaderProps {
    breadcrumbs: {
        label: string
        href?: string
    }[]
}

export function DashboardHeader({ breadcrumbs }: DashboardHeaderProps) {
    const { loading, hasActiveTurno, turno, refetch } = useCheckTurno()
    
    return (
        <header className="flex h-auto min-h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:min-h-12">
            <div className="flex items-center justify-between gap-4 px-4 py-2 w-full">
                {/* Left side: Trigger, separator, and breadcrumbs */}
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((crumb, index) => (
                                <React.Fragment key={`breadcrumb-${index}`}>
                                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                                    <BreadcrumbItem className={index === 0 ? 'hidden md:block' : undefined}>
                                        {crumb.href ? (
                                            <BreadcrumbLink href={crumb.href}>
                                                {crumb.label}
                                            </BreadcrumbLink>
                                        ) : (
                                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                </React.Fragment>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Right side: Widget de caja activa (si aplica) */}
                {!loading && hasActiveTurno && turno && (
                    <div className="hidden lg:block w-80">
                        <WidgetCajaActiva turno={turno} onTurnoCerrado={refetch} />
                    </div>
                )}
            </div>
        </header>
    )
}
