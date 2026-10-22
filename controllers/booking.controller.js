import crypto from "node:crypto";
import supabase from "../config/supabase.js";
import { sendPushToUser } from "../services/pushNotification.service.js";

// =======================
// HELPERS
// =======================
function timeSlotToMinutes(timeSlot) {
  if (typeof timeSlot !== "string") return null;

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

function formatTime(value) {
  if (!value) return null;

  const [hourString, minuteString] = String(value).split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    return null;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function getApprovedBarber(userId) {
  return supabase
    .from("barbers")
    .select("id, shop_name, status")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
}

async function checkWeeklyAvailability(barberId, date, timeSlot) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { available: false, message: "Invalid booking date" };
  }

  const dateObj = new Date(`${date}T12:00:00Z`);

  if (
    Number.isNaN(dateObj.getTime()) ||
    dateObj.toISOString().slice(0, 10) !== date
  ) {
    return { available: false, message: "Invalid booking date" };
  }

  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
  ];

  const dayOfWeek = days[dateObj.getUTCDay()];

  const { data: schedule, error } = await supabase
    .from("weekly_availability")
    .select("enabled, start_time, end_time, break_start, break_end")
    .eq("barber_id", barberId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (error) throw error;

  // Preserve existing behavior if no schedule has been configured.
  if (!schedule) {
    return {
      available: true,
      message: "No weekly schedule configured"
    };
  }

  if (!schedule.enabled) {
    return {
      available: false,
      message: `Shop is closed on ${dayOfWeek}`
    };
  }

  const slot = timeSlotToMinutes(timeSlot);
  const start = timeSlotToMinutes(formatTime(schedule.start_time));
  const end = timeSlotToMinutes(formatTime(schedule.end_time));

  if (slot === null || start === null || end === null || start >= end) {
    return {
      available: false,
      message: "Invalid time slot or shop schedule"
    };
  }

  if (slot < start || slot >= end) {
    return {
      available: false,
      message: "Shop is closed at this time"
    };
  }

  if (schedule.break_start && schedule.break_end) {
    const breakStart = timeSlotToMinutes(formatTime(schedule.break_start));
    const breakEnd = timeSlotToMinutes(formatTime(schedule.break_end));

    if (
      breakStart !== null &&
      breakEnd !== null &&
      breakStart < breakEnd &&
      slot >= breakStart &&
      slot < breakEnd
    ) {
      return {
        available: false,
        message: "Shop is on break at this time"
      };
    }
  }

  return {
    available: true,
    message: "Slot is within shop availability"
  };
}

// =======================
// CREATE BOOKING
// =======================
export async function createBooking(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      barber_id,
      service_ids,
      service_id,
      date,
      time_slot,
      home_service
    } = req.body;

    const services = service_ids || (service_id ? [service_id] : []);

    if (
      !barber_id ||
      !Array.isArray(services) ||
      services.length === 0 ||
      services.some(id => !id) ||
      !date ||
      !time_slot
    ) {
      return res.status(400).json({
        error: "barber_id, service_id(s), date and time_slot are required"
      });
    }

    if (new Set(services.map(String)).size !== services.length) {
      return res.status(400).json({
        error: "Duplicate services are not allowed"
      });
    }

    if (
      home_service !== undefined &&
      typeof home_service !== "boolean"
    ) {
      return res.status(400).json({
        error: "home_service must be true or false"
      });
    }

    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id, status, user_id, shop_name")
      .eq("id", barber_id)
      .maybeSingle();

    if (barberError) {
      console.error("Find booking barber error:", barberError);
      return res.status(500).json({ error: "Failed to verify barber" });
    }

    if (
      !barber ||
      String(barber.status).toLowerCase() !== "approved"
    ) {
      return res.status(400).json({
        error: "Approved barber not found"
      });
    }

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

    // Confirm all selected services belong to the chosen barber.
    const { data: selectedServices, error: servicesError } = await supabase
      .from("services")
      .select("id, barber_id, price")
      .eq("barber_id", barber_id)
      .in("id", services);

    if (servicesError) {
      console.error("Validate services error:", servicesError);
      return res.status(500).json({
        error: "Failed to verify services"
      });
    }

    if (!selectedServices || selectedServices.length !== services.length) {
      return res.status(400).json({
        error: "One or more services are invalid for this barber"
      });
    }

    // Calculate price on the server instead of trusting the client.
    const calculatedTotal = selectedServices.reduce(
      (sum, service) => sum + Number(service.price || 0),
      0
    );

    const { data: existingBooking, error: existingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("barber_id", barber_id)
      .eq("date", date)
      .eq("time_slot", time_slot)
      .not("status", "in", '("cancelled","completed","rejected")')
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Check existing booking error:", existingError);
      return res.status(500).json({
        error: "Failed to check booking slot"
      });
    }

    if (existingBooking) {
      return res.status(409).json({
        error: "This slot is already booked"
      });
    }

    const sharedOtp = generateOtp();

    const bookings = services.map(id => ({
      barber_id,
      service_id: id,
      customer_id: req.user.id,
      date,
      time_slot,
      home_service: home_service ?? false,
      status: "pending",
      total_amount: calculatedTotal,
      otp: sharedOtp
    }));

    const { error: insertError } = await supabase
      .from("bookings")
      .insert(bookings);

    if (insertError) {
      console.error("Create booking error:", insertError);
      return res.status(500).json({
        error: "Failed to create booking"
      });
    }

    if (barber.user_id) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: barber.user_id,
          customer_id: req.user.id,
          message: `New booking received! ${services.length} service(s) booked for ${date} at ${time_slot}.`
        })
        .select("id")
        .single();

      if (notificationError) {
        console.error("Booking notification error:", notificationError.code || "unknown");
      } else {
        void sendPushToUser({
          userId: barber.user_id,
          title: "New booking",
          body: `A new booking was requested for ${date} at ${time_slot}.`,
          data: { type: "booking_created", date, time_slot },
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully"
    });
  } catch (err) {
    console.error("Create booking error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
// =======================
// GET MY BOOKINGS
// =======================
export async function getMyBookings(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name, price, duration, home_service)")
      .eq("customer_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get my bookings error:", error);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Get my bookings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// BARBER – MY RECEIVED BOOKINGS
// =======================
export async function getBarberBookings(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: barber, error: barberError } =
      await getApprovedBarber(req.user.id);

    if (barberError) {
      console.error("Find barber bookings error:", barberError);
      return res.status(500).json({ error: "Failed to verify barber" });
    }

    if (!barber) {
      return res.status(403).json({ error: "Not an approved barber" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "*, services(name, price, duration, home_service), profiles(full_name, avatar_url)"
      )
      .eq("barber_id", barber.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get barber bookings error:", error);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }

    const grouped = {};

    data.forEach((booking) => {
      const key =
        `${booking.customer_id}_${booking.date}_${booking.time_slot}`;

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

        grouped[key].total_price += Number(booking.services.price || 0);
      }
    });

    return res.json(Object.values(grouped));
  } catch (err) {
    console.error("Get barber bookings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// ADMIN – ALL BOOKINGS
// Protect /all route with adminMiddleware.
// =======================
export async function getAllBookings(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name, price, duration, home_service)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get all bookings error:", error);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Get all bookings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// CANCEL BOOKING
// Customer or the booking's barber can cancel.
// =======================
export async function cancelBooking(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Booking ID required" });
    }

    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select("id, customer_id, barber_id, date, time_slot, status")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error("Find booking error:", findError);
      return res.status(500).json({ error: "Failed to find booking" });
    }

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isCustomer = booking.customer_id === req.user.id;

    const { data: ownedBarber, error: ownerError } = await supabase
      .from("barbers")
      .select("id")
      .eq("id", booking.barber_id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (ownerError) {
      console.error("Check booking owner error:", ownerError);
      return res.status(500).json({ error: "Failed to verify booking owner" });
    }

    if (!isCustomer && !ownedBarber) {
      return res.status(403).json({
        error: "You cannot cancel this booking"
      });
    }

    if (["cancelled", "completed", "rejected"].includes(booking.status)) {
      return res.status(400).json({
        error: `Cannot cancel a ${booking.status} booking`
      });
    }

    // Cancel all service rows belonging to the same appointment.
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("customer_id", booking.customer_id)
      .eq("barber_id", booking.barber_id)
      .eq("date", booking.date)
      .eq("time_slot", booking.time_slot)
      .not("status", "in", '("cancelled","completed","rejected")')
      .select("id");

    if (updateError) {
      console.error("Cancel booking error:", updateError);
      return res.status(500).json({ error: "Failed to cancel booking" });
    }

    if (!updated?.length) {
      return res.status(409).json({ error: "Booking status has changed" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Cancel booking error:", err);
    return res.status(500).json({ error: "Server error" });
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

    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id, status")
      .eq("id", barber_id)
      .maybeSingle();

    if (barberError) {
      console.error("Check barber error:", barberError);
      return res.status(500).json({ error: "Failed to verify barber" });
    }

    if (
      !barber ||
      String(barber.status).toLowerCase() !== "approved"
    ) {
      return res.status(404).json({ error: "Approved barber not found" });
    }

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

    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("barber_id", barber_id)
      .eq("date", date)
      .eq("time_slot", time_slot)
      .not("status", "in", '("cancelled","completed","rejected")')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Check slot error:", error);
      return res.status(500).json({ error: "Failed to check slot" });
    }

    return res.json({
      available: !data,
      message: data ? "Slot already booked" : "Slot is available"
    });
  } catch (err) {
    console.error("Slot availability error:", err);
    return res.status(500).json({ error: "Server error" });
  }
      }
// =======================
// UPDATE BOOKING STATUS (BARBER)
// =======================
export async function updateBookingStatus(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid booking ID or status" });
    }

    const { data: barber, error: barberError } =
      await getApprovedBarber(req.user.id);

    if (barberError) {
      console.error("Verify barber error:", barberError);
      return res.status(500).json({ error: "Failed to verify barber" });
    }

    if (!barber) {
      return res.status(403).json({ error: "Not an approved barber" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, customer_id, date, time_slot, barber_id, status")
      .eq("id", id)
      .eq("barber_id", barber.id)
      .maybeSingle();

    if (bookingError) {
      console.error("Find booking error:", bookingError);
      return res.status(500).json({ error: "Failed to find booking" });
    }

    if (!booking) {
      return res.status(404).json({ error: "Booking not found for your shop" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        error: "Only pending bookings can be approved or rejected"
      });
    }

    const otp = status === "approved" ? generateOtp() : null;

    // Update all services in the same appointment.
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        status,
        ...(otp ? { otp } : {})
      })
      .eq("customer_id", booking.customer_id)
      .eq("date", booking.date)
      .eq("time_slot", booking.time_slot)
      .eq("barber_id", booking.barber_id)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      console.error("Update booking error:", updateError);
      return res.status(500).json({ error: "Failed to update booking" });
    }

    if (!updated?.length) {
      return res.status(409).json({ error: "Booking status has changed" });
    }

    const message = status === "approved"
      ? `Your booking is confirmed! 🎉 Your OTP is: ${otp} — Please show this OTP to your barber when you arrive for your service.`
      : "Your booking has been declined. ❌ Please try booking another slot.";

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: booking.customer_id,
        message
      })
      .select("id")
      .single();

    if (notificationError) {
      console.error("Notification error:", notificationError.code || "unknown");
    } else {
      void sendPushToUser({
        userId: booking.customer_id,
        title: status === "approved" ? "Booking confirmed" : "Booking declined",
        body: status === "approved"
          ? "Your booking is confirmed."
          : "Your booking has been declined. Please try booking another slot.",
        data: { type: "booking_status", status },
      });
    }

    return res.json({
      success: true,
      message: `Booking ${status}`
    });
  } catch (err) {
    console.error("Update booking status error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// VERIFY OTP (BARBER)
// =======================
export async function verifyOtp(req, res) {
  try {
    if (!req.user?.id) {
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
      .select("id, otp, status, customer_id, date, time_slot, barber_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (bookingError) {
      console.error("Find OTP booking error:", bookingError);
      return res.status(500).json({ error: "Failed to verify booking" });
    }

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { data: barber, error: barberError } =
      await getApprovedBarber(req.user.id);

    if (barberError) {
      console.error("Verify OTP barber error:", barberError);
      return res.status(500).json({ error: "Failed to verify barber" });
    }

    if (!barber || barber.id !== booking.barber_id) {
      return res.status(403).json({
        error: "You cannot verify another barber's booking"
      });
    }

    if (booking.status !== "approved") {
      return res.status(400).json({
        error: "Only approved bookings can be completed"
      });
    }

    if (String(booking.otp) !== String(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const { data: completed, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        otp_verified: true
      })
      .eq("id", booking.id)
      .eq("barber_id", barber.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Complete booking error:", updateError);
      return res.status(500).json({ error: "Failed to complete booking" });
    }

    if (!completed) {
      return res.status(409).json({
        error: "Booking status has changed; please retry"
      });
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: booking.customer_id,
        message: "Your service has been completed successfully! ✅ Thank you for choosing us."
      })
      .select("id")
      .single();

    if (notificationError) {
      console.error("Completion notification error:", notificationError.code || "unknown");
    } else {
      void sendPushToUser({
        userId: booking.customer_id,
        title: "Service completed",
        body: "Your service has been completed successfully. Thank you for choosing us.",
        data: { type: "service_completed" },
      });
    }

    return res.json({
      success: true,
      message: "Service completed successfully"
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// GET NOTIFICATIONS
// =======================
export async function getNotifications(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    const customerIds = [
      ...new Set(
        data.map((notification) => notification.customer_id).filter(Boolean)
      ),
    ];
    let customersById = new Map();

    if (customerIds.length > 0) {
      const { data: customers, error: customerError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", customerIds);

      if (customerError) {
        console.error("Get notification customer profiles error:", customerError);
        return res.status(500).json({
          error: "Failed to fetch notification customer profiles",
        });
      }

      customersById = new Map(
        customers.map((customer) => [customer.id, customer])
      );
    }

    return res.json(
      data.map((notification) => {
        const customer = customersById.get(notification.customer_id);
        return {
          ...notification,
          customer_full_name: customer?.full_name ?? null,
          customer_avatar_url: customer?.avatar_url ?? null,
        };
      })
    );
  } catch (err) {
    console.error("Get notifications error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// MARK NOTIFICATIONS READ
// =======================
export async function markNotificationsRead(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Mark notifications read error:", error);
      return res.status(500).json({ error: "Failed to update notifications" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return res.status(500).json({ error: "Server error" });
  }
      }
