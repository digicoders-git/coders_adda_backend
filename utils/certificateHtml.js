export const generateCertificateHTML = (template, user, course, fontCSS, certId, issueDate) => {
  const studentName = user.name || user.fullName || "Student Name";
  const courseTitle = course.title || "Course Name";

  const renderText = (cfg, value) => {
    if (!cfg?.status || !value) return "";

    return `
    <div class="text"
      style="
        left: ${cfg.horizontalPosition}px;
        top: ${cfg.verticalPosition}px;
        font-family: '${cfg.fontFamily}', sans-serif;
        font-size: ${cfg.fontSize};
        color: ${cfg.textColor};
        font-weight: ${cfg.bold ? "bold" : "normal"};
        font-style: ${cfg.italic ? "italic" : "normal"};
        text-decoration: ${cfg.underline ? "underline" : "none"};
      ">
      ${value}
    </div>
  `;
  };

  // Extract layers safely
  const getLayer = (layerName) => template[layerName] || (template._doc ? template._doc[layerName] : null);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      ${fontCSS}

      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      .cert-container {
        position: relative;
        width: ${template.width || 1200}px;
        height: ${template.height || 800}px;
        background-color: white;
      }

      .cert-bg {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .text {
        position: absolute;
        transform: translate(-50%, -50%);
        text-align: center;
        white-space: nowrap;
      }
    </style>
  </head>

  <body>
    <div class="cert-container">
      <img src="${template.certificateImage}" class="cert-bg" />

      ${renderText(getLayer("studentName"), studentName)}
      ${renderText(getLayer("courseName"), courseTitle)}
      ${renderText(getLayer("certificateId"), certId)}
      ${renderText(getLayer("collegeName"), user.college || "CodersAdda")}
      ${renderText(getLayer("issueDate"), issueDate)}
    </div>
  </body>
  </html>
  `;
};
