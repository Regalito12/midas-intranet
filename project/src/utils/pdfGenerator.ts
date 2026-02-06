import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollSlip } from '../types.ts';

export const generatePayrollPDF = (slip: PayrollSlip) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text('VOLANTE DE PAGO', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('MIDAS Dominicana S.A.', 105, 26, { align: 'center' });

    // Meta Info Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 32, 182, 24, 2, 2, 'FD');

    doc.setTextColor(60);
    doc.setFontSize(9);

    doc.text('Periodo de Pago:', 20, 42);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(slip.period, 20, 48);

    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text('Fecha de Emisión:', 100, 42);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(new Date(slip.payment_date).toLocaleDateString('es-DO'), 100, 48);

    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text('No. Referencia:', 160, 42);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`#${slip.id.substring(0, 8)}`, 160, 48);

    // Employee Details
    autoTable(doc, {
        startY: 65,
        head: [['Detalles del Colaborador', '']],
        body: [
            ['Nombre Completo', slip.employee_name],
            ['Departamento', slip.employee_department],
            ['Cargo', slip.employee_position],
            ['Método de Pago', slip.payment_method],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], textColor: 255, fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60, fillColor: [240, 240, 240] },
            1: { cellWidth: 'auto' }
        },
        styles: { fontSize: 9, cellPadding: 3 }
    });

    const currency = (val: number) => `RD$ ${val.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

    // Financial Breakdown
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Concepto Ingresos', 'Monto', 'Concepto Deducciones', 'Monto']],
        body: [
            ['Salario Base', currency(slip.base_salary), 'AFP (2.87%)', currency(slip.afp)],
            ['Bonificaciones', currency(slip.bonuses), 'SFS (3.04%)', currency(slip.sfs)],
            ['Horas Extra', currency(slip.overtime), 'ISR (Impuesto)', currency(slip.isr)],
            ['Otros Ingresos', currency(0), 'Otras Deducciones', currency(slip.other_deductions)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], textColor: 255, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0] },
            2: { cellWidth: 50 },
            3: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [180, 0, 0] }
        },
        styles: { fontSize: 9 }
    });

    // Subtotals
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY,
        body: [
            ['Total Ingresos', currency(slip.gross_salary), 'Total Deducciones', currency(slip.total_deductions)]
        ],
        theme: 'grid',
        styles: { fontStyle: 'bold', fontSize: 10, fillColor: [230, 230, 230] },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 40, halign: 'right' },
            2: { cellWidth: 50 },
            3: { cellWidth: 40, halign: 'right', textColor: [180, 0, 0] }
        }
    });

    // Net Salary
    doc.setDrawColor(0, 100, 0);
    doc.setFillColor(240, 255, 240);
    doc.roundedRect(120, (doc as any).lastAutoTable.finalY + 15, 76, 30, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(0, 100, 0);
    doc.text('NETO A PERCIBIR', 158, (doc as any).lastAutoTable.finalY + 25, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(currency(slip.net_salary), 158, (doc as any).lastAutoTable.finalY + 35, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('Generado el ' + new Date().toLocaleString(), 14, 280);
    doc.text('Página 1 de 1', 190, 280, { align: 'right' });

    // Save
    doc.save(`Volante_${slip.period.replace(/[\s/]/g, '_')}_${slip.employee_name.replace(/[\s]/g, '_')}.pdf`);
};
