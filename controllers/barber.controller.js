import supabase from "../config/supabase.js";

// 1. Register Barber
export async function registerBarber(req, res) {
  try {
    const { shop_name, location } = req.body;
    const { data, error } = await supabase
      .from("barbers")
      .insert({
        user_id: req.user.id,
        shop_name: shop_name || "My Salon",
        location: location || "Not set",
        status: "pending"
      })
      .select()
      .single();

    if (error) return res.status(400).json(error);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 2. Approve Barber
export async function approveBarber(req, res) {
  try {
    const { id, user_id } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({ error: "Missing id or user_id" });
    }

    await supabase.from("barbers").update({ status: "approved" }).eq("id", id);

    const { error: profileError } = await supabase.from("profiles").update({ role: "barber" }).eq("id", user_id);

    if (profileError) return res.status(400).json(profileError);

    res.json({ success: true, message: "Approved & Role Updated!" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 3. Get Pending
export async function getPendingBarbers(req, res) {
  try {
    const { data, error } = await supabase.from("barbers").select("*").eq("status", "pending");
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 4. Get Approved
export async function getApprovedBarbers(req, res) {
  try {
    const { data, error } = await supabase.from("barbers").select("*").eq("status", "approved");
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 5. Get My Barber Profile
export async function getMyBarberProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Barber profile not found" });

    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 6. Update Shop Details
export async function updateShopDetails(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { shop_name, location, description, phone } = req.body;

    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .single();

    if (barberError || !barber) {
      return res.status(404).json({ error: "Barber profile not found" });
    }

    const { error } = await supabase
      .from("barbers")
      .update({
        ...(shop_name && { shop_name }),
        ...(location && { location }),
        ...(description && { description }),
        ...(phone && { phone })
      })
      .eq("id", barber.id);

    if (error) return res.status(400).json(error);

    res.json({ success: true, message: "Shop details updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

// 7. Get Barber Dashboard Stats
export async function getBarberDashboard(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("status", "approved")
      .single();

    if (barberError || !barber) {
      return res.status(403).json({ error: "Not an approved barber" });
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, services(price)")
      .eq("barber_id", barber.id);

    if (error) return res.status(400).json(error);

    const total = bookings.length;
    const pending = bookings.filter(b => b.status === "pending").length;
    const approved = bookings.filter(b => b.status === "approved").length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
    const totalEarnings = bookings
      .filter(b => b.status === "completed")
      .reduce((sum, b) => sum + (b.services?.price || 0), 0);

    return res.json({
      total,
      pending,
      approved,
      completed,
      cancelled,
      totalEarnings
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
      }
// 8. Permanently Delete My Shop
export async function deleteMyShop(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find only the shop belonging to the logged-in barber
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .single();

    if (barberError || !barber) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const barberId = barber.id;

    // 1. Get all shop images
    const { data: files, error: listError } = await supabase.storage
      .from("shop-images")
      .list(barberId, { limit: 1000 });

    if (listError) {
      return res.status(400).json({
        error: "Failed to read shop images",
        details: listError.message
      });
    }

    // 2. Delete shop images from Storage
    if (files && files.length > 0) {
      const filePaths = files.map((file) => `${barberId}/${file.name}`);

      const { error: storageError } = await supabase.storage
        .from("shop-images")
        .remove(filePaths);

      if (storageError) {
        return res.status(400).json({
          error: "Failed to delete shop images",
          details: storageError.message
        });
      }
    }

    // 3. Delete shop image records
    const { error: mediaError } = await supabase
      .from("shop_media")
      .delete()
      .eq("barber_id", barberId);

    if (mediaError) {
      return res.status(400).json({
        error: "Failed to delete shop media records",
        details: mediaError.message
      });
    }

    // 4. Delete barber/shop
    // Related services, availability, weekly availability,
    // bookings and reviews are now CASCADE.
    const { error: deleteError } = await supabase
      .from("barbers")
      .delete()
      .eq("id", barberId)
      .eq("user_id", req.user.id);

    if (deleteError) {
      return res.status(400).json({
        error: "Failed to delete shop",
        details: deleteError.message
      });
    }

    return res.json({
      success: true,
      message: "Shop permanently deleted"
    });

  } catch (err) {
    console.error("Delete shop error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
