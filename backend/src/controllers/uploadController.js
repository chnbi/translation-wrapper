const ocrService = require('../services/ocrService');
const translationService = require('../services/translationService');
const supabase = require('../config/supabaseClient');

// Helper to update project statistics after a change in translations
const updateProjectStatistics = async (projectId) => {
    if (!projectId) return;
  
    const { data: translationStatuses, error: statusError } = await supabase
        .from('translations')
        .select('status')
        .eq('project_id', projectId);
  
    if (statusError) {
        console.error(`Failed to fetch statuses for stats update on project ${projectId}:`, statusError.message);
        return;
    }
    
    const stats = {
        totalItems: translationStatuses.length,
        approvedItems: translationStatuses.filter(t => t.status === 'approved').length,
        pendingItems: translationStatuses.filter(t => t.status === 'pending').length,
        rejectedItems: translationStatuses.filter(t => t.status === 'rejected').length
    };
  
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

// Process an image already uploaded to Supabase Storage
exports.processStorageImage = async (req, res) => {
    try {
        const { projectId, page, section, elementType, elementName, storagePath, autoTranslate = true } = req.body;

        if (!projectId || !page || !section || !storagePath) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, page, section, storagePath'
            });
        }

        // 1. Perform OCR on the image in storage
        const ocrResult = await ocrService.extractTextFromStoragePath(storagePath);

        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'OCR extraction failed',
                details: ocrResult.message
            });
        }
        
        // 2. Create initial translation entry
        const { data: initialTranslation, error: insertError } = await supabase
            .from('translations')
            .insert({
                project_id: projectId,
                page,
                section,
                element_type: elementType || 'other',
                element_name: elementName || storagePath.split('/').pop(),
                content_en: ocrResult.text,
                source_type: 'ocr',
                ocr_confidence: ocrResult.confidence
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('Supabase insert error:', insertError.message);
            return res.status(500).json({ success: false, error: `Supabase insert error: ${insertError.message}` });
        }
        
        let finalTranslation = initialTranslation;

        // 3. Auto-translate if requested and text was found
        if (autoTranslate && ocrResult.text) {
            try {
                const [bmResult, zhResult] = await Promise.all([
                    translationService.translateText(ocrResult.text, 'en', 'bm', 'v1.0'),
                    translationService.translateText(ocrResult.text, 'en', 'zh', 'v1.0')
                ]);
                
                const allGlossaryTerms = [...new Set([...(bmResult.glossaryMatches || []), ...(zhResult.glossaryMatches || [])])];
        
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
                console.error('Auto-translation service error during upload:', error);
                // Non-fatal: continue even if auto-translation fails
            }
        }

        // 4. Update project statistics
        await updateProjectStatistics(projectId);

        res.json({
            success: true,
            data: {
                translation: finalTranslation,
                ocr: {
                    text: ocrResult.text,
                    confidence: ocrResult.confidence,
                    message: ocrResult.message
                }
            },
            message: 'Image processed, text extracted, and auto-translated successfully.'
        });

    } catch (error) {
        console.error('processStorageImage controller error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
