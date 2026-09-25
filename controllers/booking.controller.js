import supabase from "../config/supabase.js";

// =======================
// WEEKLY AVAILABILITY CHECK
// =======================
function timeSlotToMinutes(timeSlot) {
  const match = timeSlot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;

  return hour * 60 + minute;
}

function formatTime(timeValue) {
  if (!timeValue) return null;

  const [hourString, minuteString] = String(timeValue).split(":");

  let hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const period = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;

  if (displayHour === 0) displayHour = 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

async function checkWeeklyAvailability(barberId, date, timeSlot) {
  const dateObj = new Date(`${date}T12:00:00Z`);

  if (Number.isNaN(dateObj.getTime())) {
    return {
      available: false,
      message: "Invalid booking date",
    };
  }

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const dayOfWeek = days[dateObj.getUTCDay()];

  const { data: schedule, error } = await supabase
    .from("weekly_availability")
    .select(
      "enabled, start_time, end_time, break_start, break_end"
    )
    .eq("barber_id", barberId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // If no weekly schedule has been saved yet,
  // keep the existing booking behavior.
  if (!schedule) {
    return {
      available: true,
      message: "No weekly schedule configured",
    };
  }

  // Any day can be disabled by the barber.
  if (!schedule.enabled) {
    return {
      available: false,
      message: `Shop is closed on ${dayOfWeek}`,
    };
  }

  const slotMinutes = timeSlotToMinutes(timeSlot);

  if (slotMinutes === null) {
    return {
      available: false,
      message: "Invalid time slot",
    };
  }

  const startMinutes = timeSlotToMinutes(
    formatTime(schedule.start_time)
  );

  const endMinutes = timeSlotToMinutes(
    formatTime(schedule.end_time)
  );

  if (startMinutes === null || endMinutes === null) {
    return {
      available: false,
      message: "Invalid shop schedule",
    };
  }

  // Block slots outside the barber's opening hours.
  if (
    slotMinutes < startMinutes ||
    slotMinutes >= endMinutes
  ) {
    return {
      available: false,
      message: "Shop is closed at this time",
    };
  }

  // Block slots during the barber's break.
  if (schedule.break_start && schedule.break_end) {
    const breakStart = timeSlotToMinutes(
      formatTime(schedule.break_start)
    );

    const breakEnd = timeSlotToMinutes(
      formatTime(schedule.break_end)
    );

    if (
      breakStart !== null &&
      breakEnd !== null &&
      slotMinutes >= breakStart &&
      slotMinutes < breakEnd
    ) {
      return {
        available: false,
        message: "Shop is on break at this time",
      };
    }
  }

  return {
    available: true,
    message: "Slot is within shop availability",
  };
}

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
      service_ids,
      service_id,
      date,
      time_slot,
      home_service,
      total_amount
    } = req.body;

    const services = service_ids || (service_id ? [service_id] : []);

    if (!barber_id || !services.length || !date || !time_slot) {
      return res.status(400).json({
        error: "barber_id, service_id(s), date and time_slot are required"
      });
    }

    // =======================
    // CHECK WEEKLY AVAILABILITY
    // =======================
    const scheduleCheck = await checkWeeklyAvailability(
      barber_id,
      date,
      time_slot
    );

    if (!scheduleCheck.available) {
      return res.status(400).json({
        error: scheduleCheck.message
      });
    }

    // =======================
    // CHECK EXISTING BOOKING
    // =======================
    const { data: existingBooking, error: existingBookingError } =
      await supabase
        .from("bookings")
        .select("id")
        .eq("barber_id", barber_id)
        .eq("date", date)
        .eq("time_slot", time_slot)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .limit(1)
        .maybeSingle();

    if (existingBookingError) {
      return res.status(400).json(existingBookingError);
    }

    if (existingBooking) {
      return res.status(400).json({
        error: "This slot is already booked"
      });
    }

    // =======================
    // GENERATE ONE SHARED OTP
    // =======================
    const sharedOtp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const bookings = services.map(sid => ({
      barber_id,
      service_id: sid,
      customer_id: req.user.id,
      date,
      time_slot,
      home_service: home_service || false,
      status: "pending",
      total_amount: total_amount || null,
      otp: sharedOtp
    }));

    const { error } = await supabase
      .from("bookings")
      .insert(bookings);

    if (error) {
      return res.status(400).json(error);
    }

    // 🔔 Barber ko ek notification bhejo
    const { data: barber } = await supabase
      .from("barbers")
      .select("user_id")
      .eq("id", barber_id)
      .single();

    if (barber) {
      await supabase.from("notifications").insert({
        user_id: barber.user_id,
        message: `New booking received! ${services.length} service(s) booked for ${date} at ${time_slot}.`,
      });
    }

    return res.json({
      success: true,
      message: "Booking created successfully"
    });

  } catch (err) {
    console.error("Create booking error:", err);

    return res.status(500).json({
      error: "Server error"
    });
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
      .select("*, services(name, price, duration, home_service)")
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
      .select("*, services(name, price, duration, home_service), profiles(full_name, avatar_url)")
      .eq("barber_id", barber.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    // ✅ Group by customer + date + time_slot
    const grouped = {};

    data.forEach(booking => {
      const key = `${booking.customer_id}_${booking.date}_${booking.time_slot}`;

      if (!grouped[key]) {
        grouped[key] = {
          ...booking,
          services_list: [],
          total_price: 0,
          otp: booking.otp
        };
      }

      if (booking.services) {
        grouped[key].services_list.push({
          ...booking.services,
          booking_id: booking.id,
          status: booking.status
        });

        grouped[key].total_price += booking.services.price || 0;
      }
    });

    return res.json(Object.values(grouped));

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
      .select("*, services(name, price, duration, home_service)")
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

    // Check weekly schedule first
    const scheduleCheck = await checkWeeklyAvailability(
      barber_id,
      date,
      time_slot
    );

    if (!scheduleCheck.available) {
      return res.json({
        available: false,
        message: scheduleCheck.message
      });
    }

    // Check existing booking
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("barber_id", barber_id)
      .eq("date", date)
      .eq("time_slot", time_slot)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(400).json(error);
    }

    return res.json({
      available: !data,
      message: data
        ? "Slot already booked"
        : "Slot is available"
    });

  } catch (err) {
    console.error("Slot availability error:", err);

    return res.status(500).json({
      error: "Server error"
    });
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
      .select("customer_id, date, time_slot, barber_id")
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    let otp = null;

    if (status === "approved") {
      otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status,
        ...(otp && { otp })
      })
      .eq("customer_id", booking.customer_id)
      .eq("date", booking.date)
      .eq("time_slot", booking.time_slot)
      .eq("barber_id", booking.barber_id);

    if (error) return res.status(400).json(error);

    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      message: status === "approved"
        ? `Your booking is confirmed! 🎉 Your OTP is: ${otp} — Please show this OTP to your barber when you arrive for your service.`
        : "Your booking has been declined. ❌ Please try booking another slot.",
    });

    return res.json({
      success: true,
      message: `Booking ${status}`
    });

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
      return res.status(400).json({
        error: "booking_id and otp are required"
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("otp, status, customer_id, date, time_slot, barber_id")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        otp_verified: true
      })
      .eq("customer_id", booking.customer_id)
      .eq("date", booking.date)
      .eq("time_slot", booking.time_slot)
      .eq("barber_id", booking.barber_id);

    if (error) return res.status(400).json(error);

    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      message: "Your service has been completed successfully! ✅ Thank you for choosing us.",
    });

    return res.json({
      success: true,
      message: "Service completed successfully"
    });

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
