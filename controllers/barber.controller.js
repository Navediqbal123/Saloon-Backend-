
import supabase from "../config/supabase.js";

// 1. Register Barber with Shop Location
export async function registerBarber(req, res) {
  try {
    const { shop_name, location, latitude, longitude } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const hasLatitude = latitude !== undefined && latitude !== null;
    const hasLongitude = longitude !== undefined && longitude !== null;

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        success: false,
        error: "Both latitude and longitude are required"
      });
    }

    if (hasLatitude) {
      if (
        !Number.isFinite(Number(latitude)) ||
        !Number.isFinite(Number(longitude)) ||
        Number(latitude) < -90 ||
        Number(latitude) > 90 ||
        Number(longitude) < -180 ||
        Number(longitude) > 180
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid GPS coordinates"
        });
      }
    }

    const barberData = {
      user_id: req.user.id,
      shop_name: shop_name?.trim() || "My Salon",
      location: location?.trim() || "Not set",
      status: "pending",
      ...(hasLatitude && {
        latitude: Number(latitude),
        longitude: Number(longitude),
        location_updated_at: new Date().toISOString(),
        location_verified: false
      })
    };

    const { data, error } = await supabase
      .from("barbers")
      .insert(barberData)
      .select()
      .single();

    if (error) {
      console.error("Register barber error:", error);
      return res.status(400).json({
        success: false,
        error: "Failed to register barber"
      });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("Register barber server error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

// 2. Approve Barber — admin access is enforced by adminMiddleware on routes
export async function approveBarber(req, res) {
  try {
    // Support both existing frontend request formats.
    const id = req.params.id || req.body.id || req.body.requestId;
    const requestedUserId = req.body.user_id || req.body.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Barber request ID is required"
      });
    }

    let query = supabase
      .from("barbers")
      .select("id, user_id, status")
      .eq("id", id)
      .eq("status", "pending");

    if (requestedUserId) {
      query = query.eq("user_id", requestedUserId);
    }

    const { data: barber, error: findError } = await query.maybeSingle();

    if (findError) {
      console.error("Find barber request error:", findError);
      return res.status(500).json({
        success: false,
        error: "Failed to verify barber request"
      });
    }

    if (!barber) {
      return res.status(404).json({
        success: false,
        error: "Pending barber request not found"
      });
    }

    const { data: updatedBarber, error: updateError } = await supabase
      .from("barbers")
      .update({ status: "approved" })
      .eq("id", barber.id)
      .eq("user_id", barber.user_id)
      .eq("status", "pending")
      .select("id, user_id, status")
      .maybeSingle();

    if (updateError || !updatedBarber) {
      console.error("Approve barber update error:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to approve barber"
      });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "barber" })
      .eq("id", barber.user_id);

    if (profileError) {
      console.error("Update barber profile role error:", profileError);
      return res.status(500).json({
        success: false,
        error: "Barber approved, but profile role update failed"
      });
    }

    return res.json({
      success: true,
      message: "Barber approved successfully",
      data: updatedBarber
    });
  } catch (err) {
    console.error("Approve barber error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

// 3. Get Pending
export async function getPendingBarbers(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("status", "pending");

    if (error) return res.status(400).json(error);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// 4. Get Approved
export async function getApprovedBarbers(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("status", "approved");

    if (error) return res.status(400).json(error);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// 5. Get My Barber Profile
export async function getMyBarberProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Barber profile not found" });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// 6. Update Shop Details
export async function updateShopDetails(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { shop_name, location, description, phone, latitude, longitude } = req.body;

    const hasLatitude = latitude !== undefined && latitude !== null;
    const hasLongitude = longitude !== undefined && longitude !== null;

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        error: "Both latitude and longitude are required"
      });
    }

    if (hasLatitude && (
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude)) ||
      Number(latitude) < -90 || Number(latitude) > 90 ||
      Number(longitude) < -180 || Number(longitude) > 180
    )) {
      return res.status(400).json({ error: "Invalid GPS coordinates" });
    }

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
        ...(shop_name !== undefined && { shop_name }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(hasLatitude && {
          latitude: Number(latitude),
          longitude: Number(longitude)
        })
      })
      .eq("id", barber.id)
      .eq("user_id", req.user.id);

    if (error) return res.status(400).json(error);

    return res.json({
      success: true,
      message: "Shop details updated successfully"
    });
  } catch (err) {
    console.error("Update shop details error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// 7. Get Barber Dashboard Stats
export async function getBarberDashboard(req, res) {
  try {
    if (!req.user?.id) {
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

    const safeBookings = bookings ?? [];
    const total = safeBookings.length;
    const pending = safeBookings.filter(b => b.status === "pending").length;
    const approved = safeBookings.filter(b => b.status === "approved").length;
    const completed = safeBookings.filter(b => b.status === "completed").length;
    const cancelled = safeBookings.filter(b => b.status === "cancelled").length;
    const totalEarnings = safeBookings
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
    console.error("Barber dashboard error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// 8. Permanently Delete My Shop
export async function deleteMyShop(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .single();

    if (barberError || !barber) {
      return res.status(404).json({ error: "Shop not found" });
    }

    const barberId = barber.id;

    const { data: files, error: listError } = await supabase.storage
      .from("shop-images")
      .list(barberId, { limit: 1000 });

    if (listError) {
      return res.status(400).json({
        error: "Failed to read shop images",
        details: listError.message
      });
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${barberId}/${file.name}`);

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
            
