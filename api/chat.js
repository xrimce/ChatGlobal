const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://pgszwcvpzwtjjnetarqx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnc3p3Y3Zwend0ampuZXRhcnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDc1MjMsImV4cCI6MjA5MDI4MzUyM30.upoRDHW70eG0JoyvLvpE9oBSX8LWCRCVrnfBN0sNQCQ"
);

const ADMIN_ID = "4134725743";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      if (req.query.type === "online") {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from("online_players")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", fiveMinAgo);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ count: count || 0 });
      }

      const after = req.query.after ? parseInt(req.query.after) : 0;
      let query = supabase
        .from("messages")
        .select("*")
        .order("id", { ascending: true })
        .limit(100);
      if (after > 0) query = query.gt("id", after);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      if (req.query.type === "heartbeat") {
        const { user_id, username } = req.body;
        if (!user_id) return res.status(400).json({ error: "Missing user_id" });
        await supabase
          .from("online_players")
          .upsert([{
            user_id: String(user_id),
            username: username || "Unknown",
            last_seen: new Date().toISOString()
          }], { onConflict: "user_id" });
        return res.status(200).json({ success: true });
      }

      if (req.query.type === "announce") {
        const { admin_id, message, duration } = req.body;
        if (String(admin_id) !== ADMIN_ID) {
          return res.status(403).json({ error: "Not authorized" });
        }
        if (!message || message.length > 500) {
          return res.status(400).json({ error: "Invalid message" });
        }

        // Default 10 seconds if not provided or 0
        const dur = (duration && duration > 0) ? duration : 10;

        const { data, error } = await supabase
          .from("messages")
          .insert([{
            username: "ANNOUNCEMENT",
            display_name: "📢 Global Announcement",
            user_id: 0,
            message: message,
            is_announcement: true,
            duration: dur
          }])
          .select();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
      }

      const { username, display_name, user_id, message } = req.body;
      if (!username || !message || message.length > 200) {
        return res.status(400).json({ error: "Invalid" });
      }
      const { data, error } = await supabase
        .from("messages")
        .insert([{ username, display_name, user_id, message }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id, admin_id } = req.body;
      if (String(admin_id) !== ADMIN_ID) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (!id) return res.status(400).json({ error: "Missing id" });
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
