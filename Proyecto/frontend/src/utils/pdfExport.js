import jsPDF from 'jspdf';

// Helper function to get filename from URL or path
const getFileName = (evidenceUrl) => {
  if (!evidenceUrl) return '';
  // Extract filename from URL (e.g., "/media/evidence/file.pdf" -> "file.pdf")
  const parts = evidenceUrl.split('/');
  return parts[parts.length - 1] || '';
};

// Helper function to get email status text
const getEmailStatusText = (emailStatus) => {
  const statusMap = {
    'valid': 'Email verificado ✅',
    'bounced': 'Email inválido / rebotado ❌',
    'pending': 'Verificando email…'
  };
  return statusMap[emailStatus] || '';
};

// Helper function to get file verification status text
const getFileVerificationStatusText = (fileStatus, fileMessage) => {
  if (!fileStatus) return '';
  
  // Si hay un mensaje del backend, usarlo directamente (ya incluye toda la info)
  if (fileMessage) {
    return fileMessage;
  }
  
  // Si no hay mensaje, usar el status básico
  const statusMap = {
    'up_to_date': 'Registros al día',
    'outdated': 'Registros con >6 meses de antigüedad',
    'very_outdated': 'Registros no están al día',
    'error': 'Error en verificación',
    'pending': 'Verificando archivo…'
  };
  
  return statusMap[fileStatus] || fileStatus;
};

// Map status to Spanish
const getStatusText = (status) => {
  const statusMap = {
    'COMPLIANT': 'Cumple',
    'NON_COMPLIANT': 'No Cumple',
    'PARTIAL': 'Cumple Parcialmente',
    'NOT_EVALUATED': 'No evaluado'
  };
  return statusMap[status] || status;
};

export const exportToPDF = (domains, stats) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 7;
  const sectionSpacing = 10;

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Informe de Cumplimiento', margin, yPosition);
  yPosition += lineHeight * 2;

  // Stats section
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  const percentage = stats?.percentage || 0;
  const compliant = stats?.compliant || 0;
  const total = stats?.total || 0;
  
  doc.text(`Porcentaje de cumplimiento: ${percentage}%`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`${compliant} de ${total} reglas cumplidas`, margin, yPosition);
  yPosition += sectionSpacing * 2;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace = lineHeight) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Iterate through domains
  domains.forEach((domain, domainIndex) => {
    checkPageBreak(sectionSpacing * 2);
    
    // Domain header
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(domain.name, margin, yPosition);
    yPosition += lineHeight;
    
    if (domain.description) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      const descLines = doc.splitTextToSize(domain.description, maxWidth);
      descLines.forEach(line => {
        checkPageBreak();
        doc.text(line, margin, yPosition);
        yPosition += lineHeight * 0.8;
      });
      yPosition += lineHeight * 0.5;
    }

    // Rules
    domain.rules.forEach((rule, ruleIndex) => {
      checkPageBreak(lineHeight * 4);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Rule reference and text
      const ruleText = rule.reference ? `${rule.reference}: ${rule.text}` : rule.text;
      const ruleLines = doc.splitTextToSize(ruleText, maxWidth);
      ruleLines.forEach(line => {
        checkPageBreak();
        doc.text(line, margin, yPosition);
        yPosition += lineHeight * 0.9;
      });
      yPosition += lineHeight * 0.3;

      // Answer/Status
      const answer = rule.user_answer;
      const status = answer ? getStatusText(answer.status) : 'No evaluado';
      
      doc.setFont(undefined, 'bold');
      doc.text(`Estado: ${status}`, margin + 5, yPosition);
      yPosition += lineHeight;

      // Notes if exists
      if (answer && answer.notes) {
        doc.setFont(undefined, 'italic');
        doc.setFontSize(9);
        const notesLines = doc.splitTextToSize(`Notas: ${answer.notes}`, maxWidth - 10);
        notesLines.forEach(line => {
          checkPageBreak();
          doc.text(line, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
        });
        doc.setFontSize(10);
        yPosition += lineHeight * 0.3;
      }

      // Recommended action if NON_COMPLIANT
      if (answer && answer.status === 'NON_COMPLIANT' && rule.suggested_action) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(200, 0, 0); // Red color
        const actionLines = doc.splitTextToSize(`Acción Sugerida: ${rule.suggested_action}`, maxWidth - 10);
        actionLines.forEach(line => {
          checkPageBreak();
          doc.text(line, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
        });
        doc.setTextColor(0, 0, 0); // Reset to black
        yPosition += lineHeight * 0.3;
      }

      // Campos dinámicos de texto (name, email, phone)
      if (answer) {
        // Email con estado de verificación
        if (rule.requires_mail === 1 && answer.email) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          const emailStatusText = getEmailStatusText(answer.email_status);
          if (emailStatusText) {
            const emailLine = `Email: ${answer.email} - ${emailStatusText}`;
            const emailLines = doc.splitTextToSize(emailLine, maxWidth - 10);
            emailLines.forEach(line => {
              checkPageBreak();
              doc.text(line, margin + 5, yPosition);
              yPosition += lineHeight * 0.8;
            });
          } else {
            doc.text(`Email: ${answer.email}`, margin + 5, yPosition);
            yPosition += lineHeight * 0.8;
          }
          doc.setFontSize(10);
        }
        
        // Nombre
        if (rule.requires_name === 1 && answer.name) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          doc.text(`Nombre: ${answer.name}`, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          doc.setFontSize(10);
        }
        
        // Teléfono
        if (rule.requires_phone === 1 && answer.phone) {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          const phoneDigits = answer.phone.replace(/\D/g, '');
          const phoneFormatted = phoneDigits.length === 9 ? `+56 ${phoneDigits}` : answer.phone;
          doc.text(`Teléfono: ${phoneFormatted}`, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          doc.setFontSize(10);
        }
      }

      // Archivos dinámicos
      const requiredFiles = rule.required_files || {};
      const requiredFileTypes = Object.keys(requiredFiles);
      
      if (requiredFileTypes.length > 0 && answer && answer.files) {
        requiredFileTypes.forEach(fileType => {
          const verificationMonths = requiredFiles[fileType] || 0;
          const file = answer.files.find(f => f.file_type === fileType);
          
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          
          if (file) {
            const fileName = getFileName(file.file);
            let fileInfo = `${fileType}: ${fileName || 'Archivo subido'}`;
            
            // Si tiene verificación de fecha (número > 0)
            if (verificationMonths > 0) {
              const verificationStatus = getFileVerificationStatusText(
                file.file_verification_status,
                file.file_verification_message
              );
              if (verificationStatus) {
                fileInfo += ` - ${verificationStatus}`;
              }
            } else {
              // Sin verificación, solo indicar que está subido
              fileInfo += ' - Subido correctamente ✓';
            }
            
            const fileLines = doc.splitTextToSize(fileInfo, maxWidth - 10);
            fileLines.forEach(line => {
              checkPageBreak();
              doc.text(line, margin + 5, yPosition);
              yPosition += lineHeight * 0.8;
            });
          } else {
            // Archivo no subido
            doc.setTextColor(150, 150, 150); // Gray color
            doc.text(`${fileType}: No subido`, margin + 5, yPosition);
            doc.setTextColor(0, 0, 0); // Reset to black
            yPosition += lineHeight * 0.8;
          }
        });
        doc.setFontSize(10);
      }

      // Evidence filename (legacy)
      const evidenceFileName = answer && answer.evidence ? getFileName(answer.evidence) : '';
      if (evidenceFileName) {
        doc.setFont(undefined, 'italic');
        doc.setFontSize(9);
        doc.text(`Evidencia: ${evidenceFileName}`, margin + 5, yPosition);
        yPosition += lineHeight;
        doc.setFontSize(10);
      }

      yPosition += lineHeight * 0.5;
    });

    yPosition += sectionSpacing;
  });

  // Footnote
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    const footnoteY = doc.internal.pageSize.getHeight() - 10;
    doc.text('Para consultar los archivos subidos como evidencia, visita el sitio de CoreCompliance', 
             margin, footnoteY, { align: 'left' });
  }

  // Save the PDF with date-month format (DD-MM-YYYY)
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const fileName = `Informe_Cumplimiento_${day}-${month}-${year}.pdf`;
  doc.save(fileName);
};

