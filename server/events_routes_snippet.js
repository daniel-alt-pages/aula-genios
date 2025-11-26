
// ============================================
// EVENTS ROUTES
// ============================================

app.get('/api/events', authenticateToken, async (req, res) => {
    try {
        // Fetch all events for now (or filter by course/user if needed)
        const events = await db.prepare('SELECT * FROM events ORDER BY start_date ASC').all();
        res.json({ success: true, events });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        const { title, description, start_date, end_date, type, course_id } = req.body;
        const eventId = randomUUID();

        await db.prepare(`
            INSERT INTO events (id, title, description, start_date, end_date, type, course_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, title, description, start_date, end_date, type || 'class', course_id, req.user.id);

        res.json({ success: true, event: { id: eventId, ...req.body } });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
