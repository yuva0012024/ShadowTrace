const { generateExport } = require('../services/exportService');
const { createNotification } = require('../services/notificationService');

/**
 * Exports a search session in CSV or JSON format
 * GET /api/export/:id?format=csv|json
 */
async function exportSearchData(req, res, next) {
  try {
    const { id } = req.params;
    const format = req.query.format || 'json';
    const userId = req.user ? req.user._id : null;
    const userRole = req.user ? req.user.role : 'user';

    const { contentType, filename, data } = await generateExport(id, format, userId, userRole);

    if (userId) {
      await createNotification(
        userId,
        'export',
        'Dossier Exported',
        `Reconnaissance dossier ${id} exported in ${format.toUpperCase()} format.`,
        { format, filename }
      );
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(data);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
}

module.exports = {
  exportSearchData
};
