const supabase = require('../config/supabaseClient');

// Helper to handle Supabase errors
const handleSupabaseError = (res, error) => {
  console.error('Supabase error:', error.message);
  res.status(500).json({ success: false, error: `Supabase error: ${error.message}` });
};

// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return handleSupabaseError(res, error);

    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single project
exports.getProject = async (req, res) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return handleSupabaseError(res, error);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new project
exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from('projects')
      .insert([
        { name, description }
      ])
      .select()
      .single();

    if (error) return handleSupabaseError(res, error);

    res.status(201).json({
      success: true,
      data,
      message: 'Project created successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const { data: project, error } = await supabase
      .from('projects')
      .update({ 
        name, 
        description, 
        status,
        updated_at: new Date().toISOString() 
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return handleSupabaseError(res, error);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    // The ON DELETE CASCADE in the database schema will handle deleting all associated translations.
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return handleSupabaseError(res, error);
    
    if (!data) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project and all associated translations deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get project statistics
exports.getProjectStats = async (req, res) => {
    try {
        const projectId = req.params.id;

        // 1. Get the project itself
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('status') // Select only what's needed for the response
            .eq('id', projectId)
            .single();

        if (projectError) return handleSupabaseError(res, projectError);
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        // 2. Get all statuses of translations for this project
        const { data: translationStatuses, error: statusError } = await supabase
            .from('translations')
            .select('status')
            .eq('project_id', projectId);

        if (statusError) return handleSupabaseError(res, statusError);
        
        // 3. Calculate statistics in JS
        const stats = {
            totalItems: translationStatuses.length,
            approvedItems: translationStatuses.filter(t => t.status === 'approved').length,
            pendingItems: translationStatuses.filter(t => t.status === 'pending').length,
            rejectedItems: translationStatuses.filter(t => t.status === 'rejected').length
        };

        // 4. Update the project with the new stats
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

        if (updateError) return handleSupabaseError(res, updateError);

        // 5. Respond with the calculated stats
        res.json({
            success: true,
            data: {
                ...stats,
                status: project.status
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
