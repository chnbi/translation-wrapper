const supabase = require('../config/supabaseClient');
const translationService = require('../services/translationService');

// Helper to handle Supabase errors
const handleSupabaseError = (res, error) => {
  console.error('Supabase error:', error.message);
  res.status(500).json({ success: false, error: `Supabase error: ${error.message}` });
};

// Helper to update project statistics after a change in translations
const updateProjectStatistics = async (projectId) => {
  if (!projectId) return;

  // Get all statuses of translations for this project
  const { data: translationStatuses, error: statusError } = await supabase
      .from('translations')
      .select('status')
      .eq('project_id', projectId);

  if (statusError) {
      console.error(`Failed to fetch statuses for stats update on project ${projectId}:`, statusError.message);
      return;
  }
  
  // Calculate statistics
  const stats = {
      totalItems: translationStatuses.length,
      approvedItems: translationStatuses.filter(t => t.status === 'approved').length,
      pendingItems: translationStatuses.filter(t => t.status === 'pending').length,
      rejectedItems: translationStatuses.filter(t => t.status === 'rejected').length
  };

  // Update the project with the new stats
  const { error: updateError } = await supabase
      .from('projects')
      .update({
          stats_total_items: stats.totalItems,
          stats_approved_items: stats.approvedItems,
          stats_pending_items: stats.pendingItems,
          stats_rejected_items: stats.rejectedItems,
          updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

  if (updateError) {
      console.error(`Failed to update stats on project ${projectId}:`, updateError.message);
  }
};


// Get all translations for a project
exports.getProjectTranslations = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, page, section } = req.query;

    let query = supabase.from('translations').select('*').eq('project_id', projectId);

    if (status) query = query.eq('status', status);
    if (page) query = query.eq('page', page);
    if (section) query = query.eq('section', section);

    const { data: translations, error } = await query.order('page').order('section').order('created_at');

    if (error) return handleSupabaseError(res, error);

    res.json({ success: true, data: translations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single translation
exports.getTranslation = async (req, res) => {
  try {
    const { data: translation, error } = await supabase
      .from('translations')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return handleSupabaseError(res, error);

    if (!translation) {
      return res.status(404).json({ success: false, error: 'Translation not found' });
    }

    res.json({ success: true, data: translation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new translation (manual text input)
exports.createTranslation = async (req, res) => {
  try {
    const { projectId, page, section, elementType, elementName, content, autoTranslate = true } = req.body;

    // 1. Create the initial record
    const { data: initialTranslation, error: insertError } = await supabase
      .from('translations')
      .insert({
        project_id: projectId,
        page,
        section,
        element_type: elementType,
        element_name: elementName,
        content_en: content.en,
        source_type: 'text'
      })
      .select()
      .single();

    if (insertError) return handleSupabaseError(res, insertError);

    let finalTranslation = initialTranslation;

    // 2. Auto-translate if requested
    if (autoTranslate && content.en) {
      try {
        const [bmResult, zhResult] = await Promise.all([
            translationService.translateText(content.en, 'en', 'bm', 'v1.0'),
            translationService.translateText(content.en, 'en', 'zh', 'v1.0')
        ]);
        
        const allGlossaryTerms = [...new Set([...(bmResult.glossaryMatches || []), ...(zhResult.glossaryMatches || [])])];

        // 3. Update the record with translations
        const { data: updatedTranslation, error: updateError } = await supabase
            .from('translations')
            .update({
                content_bm: bmResult.success ? bmResult.translation : '',
                content_zh: zhResult.success ? zhResult.translation : '',
                glossary_terms: allGlossaryTerms
            })
            .eq('id', initialTranslation.id)
            .select()
            .single();
        
        if (updateError) console.error('Auto-translation update error:', updateError.message);
        else finalTranslation = updatedTranslation;

      } catch (error) {
        console.error('Auto-translation service error:', error);
      }
    }

    // 4. Update project stats
    await updateProjectStatistics(projectId);

    res.status(201).json({
      success: true,
      data: finalTranslation,
      message: 'Translation created successfully.'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Generate AI translation
exports.generateTranslation = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetLang, glossaryVersion } = req.body;

    // 1. Get current translation
    const { data: translation, error: fetchError } = await supabase
        .from('translations').select('*').eq('id', id).single();
    
    if (fetchError) return handleSupabaseError(res, fetchError);
    if (!translation) return res.status(404).json({ success: false, error: 'Translation not found' });

    // 2. Generate translation
    const result = await translationService.translateText(translation.content_en, 'en', targetLang, glossaryVersion || 'v1.0');
    if (!result.success) {
      return res.status(500).json({ success: false, error: 'Translation generation failed', details: result.warnings });
    }

    // 3. Update translation record
    const updatePayload = {
      [`content_${targetLang}`]: result.translation,
      glossary_terms: result.glossaryMatches
    };
    if (result.warnings && result.warnings.length > 0) {
        updatePayload[`warnings_${targetLang}`] = result.warnings.join('; ');
    }

    const { data: updatedTranslation, error: updateError } = await supabase
        .from('translations').update(updatePayload).eq('id', id).select().single();

    if (updateError) return handleSupabaseError(res, updateError);

    res.json({ success: true, data: updatedTranslation, message: `${targetLang.toUpperCase()} translation generated` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// Batch generate translations (simplified for now)
exports.batchGenerateTranslations = async (req, res) => {
    // This is a complex operation and is left for a future focused refactoring.
    // The logic would involve fetching multiple items and updating them one by one with delays.
    res.status(501).json({ success: false, error: 'Batch generation is not implemented in this version.' });
};


// Update translation (manual edit)
exports.updateTranslation = async (req, res) => {
  try {
    const { id } = req.params;
    const { content_en, content_bm, content_zh, notes } = req.body;

    const { data: updatedTranslation, error } = await supabase
        .from('translations')
        .update({ content_en, content_bm, content_zh, notes })
        .eq('id', id)
        .select()
        .single();
    
    if (error) return handleSupabaseError(res, error);
    if (!updatedTranslation) return res.status(404).json({ success: false, error: 'Translation not found' });

    // Status might have changed, so we update stats
    await updateProjectStatistics(updatedTranslation.project_id);

    res.json({ success: true, data: updatedTranslation, message: 'Translation updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update status of one or more translations
const updateStatus = async (res, translationIds, status, reviewer, notes) => {
    if (!translationIds || !Array.isArray(translationIds) || translationIds.length === 0) {
        return res.status(400).json({ success: false, error: 'translationIds array is required' });
    }

    const updatePayload = { status };
    if (reviewer) updatePayload.reviewer = reviewer;
    if (notes) updatePayload.notes = notes;
    if (status === 'approved') updatePayload.reviewed_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('translations')
        .update(updatePayload)
        .in('id', translationIds)
        .select('id, project_id');
    
    if (error) return handleSupabaseError(res, error);

    // Update stats for all affected projects
    if (data && data.length > 0) {
        const projectIds = [...new Set(data.map(t => t.project_id))];
        for (const projectId of projectIds) {
            await updateProjectStatistics(projectId);
        }
    }
    
    res.json({
        success: true,
        data: { modified: data.length, total: translationIds.length },
        message: `${data.length} translation(s) status updated to ${status}`
    });
};

// Approve one or more translations
exports.approveTranslation = (req, res) => {
    const { reviewer } = req.body;
    updateStatus(res, [req.params.id], 'approved', reviewer || 'Marketing Team', null);
};

// Reject one or more translations
exports.rejectTranslation = (req, res) => {
    const { notes } = req.body;
    updateStatus(res, [req.params.id], 'rejected', null, notes || 'Rejected for review');
};

// Bulk approve
exports.bulkApproveTranslations = (req, res) => {
    const { translationIds, reviewer } = req.body;
    updateStatus(res, translationIds, 'approved', reviewer || 'Marketing Team', null);
};

// Bulk reject
exports.bulkRejectTranslations = (req, res) => {
    const { translationIds, notes } = req.body;
    updateStatus(res, translationIds, 'rejected', null, notes || 'Rejected for review');
};

// Delete translation
exports.deleteTranslation = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('translations')
      .delete()
      .eq('id', req.params.id)
      .select('id, project_id')
      .single();

    if (error) return handleSupabaseError(res, error);
    if (!data) return res.status(404).json({ success: false, error: 'Translation not found' });
    
    await updateProjectStatistics(data.project_id);

    res.json({ success: true, message: 'Translation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
