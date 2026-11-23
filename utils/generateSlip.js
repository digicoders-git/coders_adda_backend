import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const generateSlipBuffer = async (payment, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const transactionId = payment._id.toString();
      const date = new Date(payment.createdAt).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const userName = user?.name || user?.fullName || 'N/A';
      const userEmail = user?.email || 'N/A';
      const type = payment.itemType === 'wallet_withdrawal' ? 'WALLET WITHDRAWAL' : payment.itemType.toUpperCase();
      const amount = `Rs. ${payment.amount}`;
      const status = payment.status.toUpperCase();

      // Top spacing
      let y = 80;

      // Add Logo Image
      try {
        const logoPath = path.join(__dirname, '../assets/mainLogo.png');
        if (fs.existsSync(logoPath)) {
          const logoData = fs.readFileSync(logoPath);
          const logoBase64 = logoData.toString('base64');
          
          // Image dimensions (adjust as needed based on actual aspect ratio)
          const imgWidth = 200;
          const imgHeight = 60;
          
          doc.addImage(logoBase64, 'PNG', (pageWidth - imgWidth) / 2, 40, imgWidth, imgHeight);
          y = 120; // adjust y below logo
        } else {
          // Fallback to text
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(36);
          doc.setTextColor(26, 86, 219); // #1a56db
          doc.text('CODERS {ADDA}', pageWidth / 2, y, { align: 'center' });
        }
      } catch (err) {
        console.error("Logo load error:", err);
      }
      
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(85, 85, 85);
      doc.text('An Initiative by DigiCoders Technologies Private Limited', pageWidth / 2, y, { align: 'center' });

      // Blue separator line
      y += 30;
      doc.setDrawColor(26, 86, 219);
      doc.setLineWidth(2);
      doc.line(40, y, pageWidth - 40, y);

      // TRANSACTION SLIP Badge
      const badgeWidth = 200;
      const badgeHeight = 30;
      doc.setFillColor(26, 86, 219);
      doc.roundedRect((pageWidth - badgeWidth) / 2, y - (badgeHeight / 2), badgeWidth, badgeHeight, 5, 5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('TRANSACTION SLIP', pageWidth / 2, y + 5, { align: 'center' });

      // Main Card Background
      y += 40;
      const cardX = 40;
      const cardY = y;
      const cardWidth = pageWidth - 80;
      const cardHeight = 350;
      
      // Light shadow effect (fake)
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(cardX + 5, cardY + 5, cardWidth, cardHeight, 15, 15, 'F');
      
      // Card Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 15, 15, 'FD');

      y += 30;
      
      const drawRow = (label, value, isStatus = false) => {
        // Icon box (fake)
        doc.setFillColor(240, 244, 255); // #f0f4ff
        doc.roundedRect(cardX + 20, y - 15, 25, 25, 4, 4, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99); // #4b5563
        doc.text(label, cardX + 60, y);
        
        doc.setTextColor(156, 163, 175);
        doc.text(':', cardX + 180, y);
        
        if (isStatus) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          if (status === 'SUCCESS') doc.setTextColor(16, 185, 129); // green
          else if (status === 'FAILED') doc.setTextColor(239, 68, 68); // red
          else doc.setTextColor(245, 158, 11); // orange
        } else {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(31, 41, 55); // #1f2937
        }
        
        doc.text(value, cardX + 200, y);
        
        y += 20;
        // Dashed line
        doc.setDrawColor(229, 231, 235); // #e5e7eb
        doc.setLineDashPattern([3, 3], 0);
        doc.line(cardX + 20, y, cardX + cardWidth - 20, y);
        doc.setLineDashPattern([], 0); // reset
        
        y += 20;
      };

      drawRow('Transaction ID', transactionId);
      drawRow('Date', date);
      drawRow('User Name', userName);
      drawRow('User Email', userEmail);
      drawRow('Type', type);
      drawRow('Amount', amount);
      drawRow('Status', status, true);

      // Success Pill
      y += 10;
      if (status === 'SUCCESS') {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.setLineWidth(1);
        doc.roundedRect(pageWidth / 2 - 100, y, 200, 30, 15, 15, 'FD');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('Payment Completed Successfully', pageWidth / 2, y + 19, { align: 'center' });
      }

      // Footer Area
      y = cardY + cardHeight + 40;
      
      // Star Icon Circle
      doc.setFillColor(26, 86, 219);
      doc.circle(pageWidth / 2, y, 15, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('+', pageWidth / 2, y + 5, { align: 'center' });

      y += 25;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(26, 86, 219);
      doc.text('Thank you for choosing CodersAdda!', pageWidth / 2, y, { align: 'center' });
      
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('This is a computer generated slip.', pageWidth / 2, y, { align: 'center' });

      // Bottom Bar
      const barHeight = 60;
      doc.setFillColor(26, 86, 219);
      doc.rect(0, pageHeight - barHeight, pageWidth, barHeight, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      
      const bY = pageHeight - barHeight + 20;
      doc.text('www.codersadda.com', 40, bY);
      doc.text('+91 1234567890', 40, bY + 15);
      doc.text('support@codersadda.com', 40, bY + 30);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(14);
      doc.text('Keep Learning, Keep Growing!  </>', pageWidth - 40, bY + 15, { align: 'right' });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      resolve(pdfBuffer);
    } catch (error) {
      reject(error);
    }
  });
};
