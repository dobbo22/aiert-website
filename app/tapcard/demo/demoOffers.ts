// Business types for the demo, each with a few offers that suit it, so the offer step reads as the visitor's own business.
export const DEMO_OFFERS: Record<string, string[]> = {
  "Coffee shop": ["Buy 5 coffees, get the 6th free", "Free coffee with any breakfast", "Free cake with any large coffee"],
  "Restaurant": ["Free dessert with any main", "10% off your bill this week", "Free glass of wine with any two courses"],
  "Pub or bar": ["Two-for-one cocktails until 7pm", "Free pint of the guest ale with any meal", "Free bar snack with any round"],
  "Takeaway": ["Free side with any large order", "10% off your first online order", "Free drink with any family meal"],
  "Bakery or deli": ["Buy 5 pastries, get the 6th free", "Free cookie with any loaf", "10% off orders over £20"],
  "Hotel or B&B": ["Free breakfast upgrade on your next stay", "10% off direct bookings", "Free late checkout on weekdays"],
  "Florist": ["6 roses for the price of 3", "Free delivery on orders over £30", "Free vase with any bouquet"],
  "Clothing or gift shop": ["10% off your next purchase", "Free gift wrapping this month", "Buy one, get one half price on accessories"],
  "Butcher, greengrocer or farm shop": ["Free sausages with orders over £25", "10% off your first box", "Free veg with any meat order"],
  "Dry cleaner or laundry": ["Free collection and delivery on your first order", "10% off your first dry clean", "Free shirt wash with any order over £25"],
  "Other shop": ["10% off your next purchase", "Free delivery this week", "Free gift with orders over £30"],
  "Hairdresser or barber": ["Free blow-dry with any colour", "10% off your next cut", "Bring a friend, they get 20% off"],
  "Beauty, nails or spa": ["Free hand massage with any facial", "10% off your next treatment", "Free nail art with any manicure"],
  "Gym or fitness studio": ["Free first class for a friend", "Free personal training taster", "Join this month, first week free"],
  "Clinic or studio": ["Free consultation", "10% off your next visit", "Bring a friend, you both save 10%"],
  "Trades or services": ["Free quote and 10% off your first job", "Free safety check with any service", "£20 off your next booking"],
  "Something else": ["10% off your first order", "Free delivery this week", "Bring a friend, you both save 10%"],
};

export const DEMO_KINDS = Object.keys(DEMO_OFFERS);
export const offersFor = (kind: string): string[] => DEMO_OFFERS[kind] ?? DEMO_OFFERS["Something else"];
