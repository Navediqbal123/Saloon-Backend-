import supabase from "../config/supabase.js";

// =======================
// CREATE BOOKING (USER / ADMIN)
// =======================
export async function createBooking(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      barber_id,
      service_id,
      date,
      time_slot,
      home_service
    } = req.body;

    if (!barber_id || !service_id || !date || !time_slot) {
      return res.status(400).json({
        error: "barber_id, service_id, date and time_slot are required"
      });
    }

    const booking = {
      barber_id,
      service_id,
      customer_id: req.user.id,
      date,
      time_slot,
      home_service: home_service || false,
      status: "pending"
    };

    const { error } = await supabase
      .from("bookings")
      .insert(booking);

    if (error) {
      return res.status(400).json(error);
    }

    // 🔔 Barber ko notification bhejo
    const { data: barber } = await supabase
      .from("barbers")
      .select("user_id")
      .eq("id", barber_id)
      .single();

    if (barber) {
      await supabase.from("notifications").insert({
        user_id: barber.user_id,
        message: "Nai booking aayi hai! Check karein.",
      });
    }

    return res.json({
      success: true,
      message: "Booking created successfully"
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// GET MY BOOKINGS (USER)
// =======================
export async function getMyBookings(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// BARBER – My received bookings
// =======================
export async function getBarberBookings(req, res) {
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

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("barber_id", barber.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// ADMIN – All bookings
// =======================
export async function getAllBookings(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// CANCEL BOOKING
// =======================
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) return res.status(400).json(error);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

// =======================
// CHECK SLOT AVAILABILITY
// =======================
export async function checkSlotAvailability(req, res) {
  try {
    const { barber_id, date, time_slot } = req.query;

    if (!barber_id || !date || !time_slot) {
      return res.status(400).json({
        error: "barber_id, date and time_slot are required"
      });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("barber_id", barber_id)
      .eq("date", date)
      .eq("time_slot", time_slot)
      .neq("status", "cancelled")
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(400).json(error);
    }

    return res.json({
      available: !data,
      message: data ? "Slot already booked" : "Slot is available"
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// UPDATE BOOKING STATUS (BARBER)
// =======================
export async function updateBookingStatus(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("customer_id")
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // ✅ OTP generate karo agar approved
    let otp = null;
    if (status === "approved") {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status, ...(otp && { otp }) })
      .eq("id", id);

    if (error) return res.status(400).json(error);

    // 🔔 Customer ko notification bhejo
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      message: status === "approved"
        ? `Your booking is confirmed! 🎉 Your OTP is: ${otp} — Please show this OTP to your barber when you arrive for your service.`
        : "Your booking has been declined. ❌ Please try booking another slot.",
    });

    return res.json({ success: true, message: `Booking ${status}` });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// VERIFY OTP (BARBER)
// =======================
export async function verifyOtp(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { booking_id, otp } = req.body;

    if (!booking_id || !otp) {
      return res.status(400).json({ error: "booking_id and otp are required" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("otp, status, customer_id")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // ✅ OTP match — service complete karo
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed", otp_verified: true })
      .eq("id", booking_id);

    if (error) return res.status(400).json(error);

    // 🔔 Customer ko completion notification
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      message: "Your service has been completed successfully! ✅ Thank you for choosing us.",
    });

    return res.json({ success: true, message: "Service completed successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// GET NOTIFICATIONS
// =======================
export async function getNotifications(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json(error);

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// MARK NOTIFICATIONS READ
// =======================
export async function markNotificationsRead(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.user.id)
      .eq("is_read", false);

    if (error) return res.status(400).json(error);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
  }
