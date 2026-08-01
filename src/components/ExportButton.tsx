import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useHarmoza } from '@/lib/store'
import { exportXlsx, exportCsv } from '@/lib/export'

export function ExportButton() {
  const { workbook, activeSheet } = useHarmoza()
  const [isExporting, setIsExporting] = useState(false)

  const hasWorkbook = !!workbook
  const hasMultipleTabs = (workbook?.sheets.length ?? 0) > 1

  const handleExportXlsx = async () => {
    if (!workbook || isExporting) return
    setIsExporting(true)
    toast.info('Preparando exportação…')
    try {
      exportXlsx(workbook)
      toast.success('Exportação XLSX concluída!')
    } catch {
      toast.error('Falha ao exportar XLSX. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCsv = async () => {
    if (!activeSheet || isExporting) return
    setIsExporting(true)
    toast.info('Preparando exportação…')
    try {
      exportCsv(activeSheet)
      toast.success(`CSV "${activeSheet.name}" exportado!`)
    } catch {
      toast.error('Falha ao exportar CSV. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  const trigger = (
    <Button variant="outline" size="sm" className="gap-1.5" disabled={!hasWorkbook || isExporting}>
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{isExporting ? 'Exportando…' : 'Exportar'}</span>
    </Button>
  )

  if (!hasWorkbook) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>Importe uma planilha primeiro</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Exportar dados</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportXlsx} className="gap-2" disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span>Exportar como XLSX</span>
            {hasMultipleTabs && (
              <span className="text-xs text-muted-foreground">
                Todas as {workbook?.sheets.length} abas
              </span>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCsv} className="gap-2" disabled={isExporting}>
          <FileText className="h-4 w-4 text-orange-600" />
          <div className="flex flex-col">
            <span>Exportar como CSV</span>
            {hasMultipleTabs ? (
              <span className="text-xs text-muted-foreground">
                Apenas aba ativa — use XLSX para todas
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Aba: {activeSheet?.name}</span>
            )}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
