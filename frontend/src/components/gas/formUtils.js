export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const buildDocumentPayload = async (docMap) => {
  const entries = Object.entries(docMap || {}).filter(([, file]) => !!file);
  const docs = await Promise.all(
    entries.map(async ([document_type, file]) => {
      const isQrObject = !(file instanceof File) && typeof file === 'object' && !!file.data;
      return {
        document_type,
        file_name: file.name || file.file_name || `${document_type}.bin`,
        mime_type: file.type || file.mime_type || 'application/octet-stream',
        size: file.size || 0,
        file_data: isQrObject ? file.data : await fileToBase64(file),
      };
    })
  );
  return docs;
};

export const validateFile = (file, maxMB = 5) => {
  if (!file) return 'No file selected';
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.type)) return 'Only JPG, PNG, and PDF files are allowed';
  if (file.size > maxMB * 1024 * 1024) return `File must be <= ${maxMB}MB`;
  return null;
};
