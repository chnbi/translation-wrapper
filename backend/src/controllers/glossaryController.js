const supabase = require('../config/supabaseClient');

// Helper to handle Supabase errors
const handleSupabaseError = (res, error) => {
  console.error('Supabase error:', error.message);
  // Handle unique constraint violation
  if (error.code === '23505') {
    return res.status(409).json({ success: false, error: 'This term already exists in this version (or another unique constraint was violated).' });
  }
  res.status(500).json({ success: false, error: `Supabase error: ${error.message}` });
};

// Get all glossary terms
exports.getAllGlossary = async (req, res) => {
  try {
    const { version, category, active } = req.query;

    let query = supabase.from('glossary').select('*');

    if (version) query = query.eq('version', version);
    if (category) query = query.eq('category', category);
    if (active !== undefined) query = query.eq('is_active', active === 'true');

    const { data: glossary, error } = await query.order('category').order('en');

    if (error) return handleSupabaseError(res, error);

    res.json({ success: true, data: glossary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single glossary term
exports.getGlossaryTerm = async (req, res) => {
  try {
    const { data: term, error } = await supabase
      .from('glossary')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return handleSupabaseError(res, error);

    if (!term) {
      return res.status(404).json({ success: false, error: 'Glossary term not found' });
    }

    res.json({ success: true, data: term });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create glossary term
exports.createGlossaryTerm = async (req, res) => {
  try {
    const { en, bm, zh, category, do_not_translate, notes, version } = req.body;

    const { data, error } = await supabase
      .from('glossary')
      .insert([
        {
          en,
          bm,
          zh,
          category: category || 'general',
          do_not_translate: do_not_translate || false,
          notes,
          version: version || 'v1.0',
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) return handleSupabaseError(res, error);

    res.status(201).json({
      success: true,
      data,
      message: 'Glossary term created successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update glossary term
exports.updateGlossaryTerm = async (req, res) => {
  try {
    const { en, bm, zh, category, do_not_translate, notes, is_active } = req.body;

    const { data: term, error } = await supabase
      .from('glossary')
      .update({ en, bm, zh, category, do_not_translate, notes, is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return handleSupabaseError(res, error);

    if (!term) {
      return res.status(404).json({ success: false, error: 'Glossary term not found' });
    }

    res.json({
      success: true,
      data: term,
      message: 'Glossary term updated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete glossary term
exports.deleteGlossaryTerm = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('glossary')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) return handleSupabaseError(res, error);

    if (!data) {
      return res.status(404).json({ success: false, error: 'Glossary term not found' });
    }

    res.json({
      success: true,
      message: 'Glossary term deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Bulk import glossary
exports.bulkImport = async (req, res) => {
  try {
    const { terms, version } = req.body;

    if (!Array.isArray(terms) || terms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid terms array'
      });
    }

    const glossaryVersion = version || 'v1.0';
    
    const termsToInsert = terms.map(termData => ({
      ...termData,
      version: glossaryVersion,
      is_active: true
    }));

    const { data: results, error } = await supabase.from('glossary').insert(termsToInsert).select();

    if (error) return handleSupabaseError(res, error);

    res.json({
      success: true,
      data: {
        imported: results.length,
        errors: 0,
        results,
        errors: []
      },
      message: `Bulk import completed successfully: ${results.length} terms imported.`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get glossary versions
exports.getVersions = async (req, res) => {
  try {
    const { data, error } = await supabase.from('glossary').select('version');

    if (error) return handleSupabaseError(res, error);

    const versions = [...new Set(data.map(item => item.version))];
    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const { data, error } = await supabase.from('glossary').select('category');

    if (error) return handleSupabaseError(res, error);
    
    const categories = [...new Set(data.map(item => item.category))];
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
