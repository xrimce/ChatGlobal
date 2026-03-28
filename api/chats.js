const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://pgszwcvpzwtjjnetarqx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnc3p3Y3Zwend0ampuZXRhcnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDc1MjMsImV4cCI6MjA5MDI4MzUyM30.upoRDHW70eG0JoyvLvpE9oBSX8LWCRCVrnfBN0sNQCQ"
);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const after = req.query.after ? parseInt(req.query.after) : 0;

      let query = supabase
        .from("messages")
        .select("*")
        .order("id", { ascending: true })
        .limit(100);

      if (after > 0) {
        query = query.gt("id", after);
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { username, display_name, user_id, message } = req.body;

      if (!username || !message) {
        return res.status(400).json({ error: "Missing fields" });
      }

      if (message.length > 200) {
        return res.status(400).json({ error: "Message too long" });
      }

      const { data, error } = await supabase
        .from("messages")
        .insert([{
          username: username,
          display_name: display_name || username,
          user_id: user_id,
          message: message
        }])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
