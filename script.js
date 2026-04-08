/**
 * SMART ROUTE OPTIMIZER - SCRIPT.JS
 * Interactive functionality for eco-routing web application
 * @version 1.0.0
 * @author Gen Coders
 */

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const CONFIG = {
  // Animation timings
  animationDuration: 800,
  counterDuration: 2000,
  scrollOffset: 100,
  
  // Fuel calculation constants (simplified model)
  fuelRates: {
    sedan: { base: 0.08, traffic: 0.12, highway: 0.06 },
    suv: { base: 0.12, traffic: 0.18, highway: 0.09 },
    bike: { base: 0.03, traffic: 0.04, highway: 0.025 }
  },
  
  // CO2 conversion (kg per liter)
  co2PerLiter: 2.31,
  
  // Cost per liter (USD)
  fuelCost: 1.50,
  
  // API endpoints (mock)
  api: {
    geocode: '/api/geocode',
    routes: '/api/routes',
    optimize: '/api/optimize'
  }
};

// ============================================
// STATE MANAGEMENT
// ============================================

const AppState = {
  currentVehicle: 'sedan',
  currentRoute: null,
  savedTrips: JSON.parse(localStorage.getItem('savedTrips')) || [],
  userPreferences: JSON.parse(localStorage.getItem('userPrefs')) || {
    defaultVehicle: 'sedan',
    units: 'metric',
    currency: 'USD'
  },
  
  // Update state methods
  setVehicle(type) {
    this.currentVehicle = type;
    this.savePreferences();
  },
  
  addTrip(trip) {
    this.savedTrips.unshift({ ...trip, id: Date.now(), date: new Date().toISOString() });
    if (this.savedTrips.length > 50) this.savedTrips.pop();
    localStorage.setItem('savedTrips', JSON.stringify(this.savedTrips));
  },
  
  savePreferences() {
    localStorage.setItem('userPrefs', JSON.stringify(this.userPreferences));
  }
};

// ============================================
// DOM ELEMENTS CACHE
// ============================================

const DOM = {
  // Navigation
  nav: document.querySelector('nav'),
  mobileMenu: document.getElementById('mobile-menu'),
  
  // Hero counters
  counters: document.querySelectorAll('.counter[data-target]'),
  
  // Route calculator
  startPoint: document.getElementById('startPoint'),
  endPoint: document.getElementById('endPoint'),
  vehicleBtns: document.querySelectorAll('.vehicle-btn'),
  routeResults: document.getElementById('route-results'),
  savingsSummary: document.getElementById('savings-summary'),
  
  // Reveal elements
  revealElements: document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale'),
  
  // Blobs for parallax
  blobs: document.querySelectorAll('.blob')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Throttle function execution
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function execution
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Easing function for animations
 */
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Generate random number in range
 */
function random(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================
// ANIMATION FUNCTIONS
// ============================================

/**
 * Animate counter from start to end value
 */
function animateCounter(element, start, end, duration = CONFIG.counterDuration) {
  const range = end - start;
  const minTimer = 50;
  let stepTime = Math.abs(Math.floor(duration / range));
  stepTime = Math.max(stepTime, minTimer);
  
  let startTime = new Date().getTime();
  let endTime = startTime + duration;
  let timer;
  
  function run() {
    let now = new Date().getTime();
    let remaining = Math.max((endTime - now) / duration, 0);
    let value = Math.round(end - (remaining * range));
    
    // Add counting animation class
    element.classList.add('counting');
    element.textContent = formatNumber(value);
    
    if (value === end) {
      clearInterval(timer);
      element.classList.remove('counting');
      element.classList.add('counted');
    }
  }
  
  timer = setInterval(run, stepTime);
  run();
  
  return timer;
}

/**
 * Intersection Observer for scroll reveals
 */
function initScrollReveal() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        
        // Handle counters within revealed elements
        const counters = entry.target.querySelectorAll('.counter[data-target]');
        counters.forEach(counter => {
          const target = parseInt(counter.getAttribute('data-target'));
          if (!counter.classList.contains('counted')) {
            animateCounter(counter, 0, target);
          }
        });
        
        // Unobserve after animation
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  DOM.revealElements.forEach(el => observer.observe(el));
}

/**
 * Parallax effect for background blobs
 */
function initParallax() {
  let ticking = false;
  
  document.addEventListener('mousemove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const x = (window.innerWidth / 2 - e.clientX) / 50;
        const y = (window.innerHeight / 2 - e.clientY) / 50;
        
        DOM.blobs.forEach((blob, index) => {
          const speed = (index + 1) * 0.5;
          const xOffset = x * speed;
          const yOffset = y * speed;
          blob.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
        
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Mobile menu toggle
 */
function toggleMobileMenu() {
  DOM.mobileMenu.classList.toggle('hidden');
  DOM.mobileMenu.classList.toggle('animate-slide-up');
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
  let lastScroll = 0;
  
  window.addEventListener('scroll', throttle(() => {
    const currentScroll = window.pageYOffset;
    
    // Add/remove scrolled class
    if (currentScroll > 50) {
      DOM.nav.classList.add('nav-scrolled');
      DOM.nav.classList.remove('glass');
      DOM.nav.classList.add('glass-strong');
    } else {
      DOM.nav.classList.remove('nav-scrolled');
      DOM.nav.classList.add('glass');
      DOM.nav.classList.remove('glass-strong');
    }
    
    // Hide/show on scroll direction (optional)
    if (currentScroll > lastScroll && currentScroll > 200) {
      DOM.nav.style.transform = 'translateY(-100%)';
    } else {
      DOM.nav.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
  }, 100));
}

/**
 * Smooth scroll to section
 */
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    const offset = CONFIG.scrollOffset;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

// ============================================
// ROUTE CALCULATOR FUNCTIONS
// ============================================

/**
 * Select vehicle type
 */
function selectVehicle(type) {
  AppState.setVehicle(type);
  
  // Update UI
  DOM.vehicleBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.id === `btn-${type}`) {
      btn.classList.add('active');
    }
  });
  
  // Add selection animation
  const activeBtn = document.getElementById(`btn-${type}`);
  activeBtn.style.transform = 'scale(0.95)';
  setTimeout(() => {
    activeBtn.style.transform = 'scale(1)';
  }, 150);
}

/**
 * Calculate fuel consumption for route
 */
function calculateFuelConsumption(distance, time, trafficFactor, vehicleType) {
  const rates = CONFIG.fuelRates[vehicleType];
  const baseConsumption = distance * rates.base;
  const trafficConsumption = (time / 60) * trafficFactor * rates.traffic;
  return Math.max(baseConsumption, trafficConsumption);
}

/**
 * Generate mock route data
 */
function generateRouteData(start, end, vehicle) {
  const distance = random(5, 50); // km
  const baseTime = distance * random(1.5, 3); // minutes
  
  // Different route types
  const routes = {
    fastest: {
      type: 'Fastest Route',
      distance: distance,
      time: Math.floor(baseTime),
      traffic: 0.8,
      color: 'gray'
    },
    shortest: {
      type: 'Shortest Route',
      distance: distance * 0.9,
      time: Math.floor(baseTime * 1.2),
      traffic: 1.0,
      color: 'blue'
    },
    eco: {
      type: 'Eco Route',
      distance: distance * 1.1,
      time: Math.floor(baseTime * 1.15),
      traffic: 0.4,
      color: 'eco'
    }
  };
  
  // Calculate fuel for each
  Object.keys(routes).forEach(key => {
    const route = routes[key];
    route.fuel = calculateFuelConsumption(
      route.distance, 
      route.time, 
      route.traffic, 
      vehicle
    );
    route.co2 = route.fuel * CONFIG.co2PerLiter;
    route.cost = route.fuel * CONFIG.fuelCost;
  });
  
  return routes;
}

/**
 * Calculate and display route comparison
 */
function calculateRoute() {
  const start = DOM.startPoint.value || 'Current Location';
  const end = DOM.endPoint.value || 'Destination';
  const vehicle = AppState.currentVehicle;
  
  // Show loading state
  const calculateBtn = document.querySelector('button[onclick="calculateRoute()"]');
  const originalText = calculateBtn.innerHTML;
  calculateBtn.innerHTML = '<span class="animate-spin">⟳</span> Calculating...';
  calculateBtn.disabled = true;
  
  // Simulate API delay
  setTimeout(() => {
    const routes = generateRouteData(start, end, vehicle);
    
    // Update UI with results
    displayRouteResults(routes);
    displaySavingsSummary(routes, vehicle);
    
    // Save trip
    AppState.addTrip({
      start,
      end,
      vehicle,
      routes,
      savings: {
        fuel: routes.fastest.fuel - routes.eco.fuel,
        cost: routes.fastest.cost - routes.eco.cost,
        co2: routes.fastest.co2 - routes.eco.co2
      }
    });
    
    // Restore button
    calculateBtn.innerHTML = originalText;
    calculateBtn.disabled = false;
    
    // Scroll to results
    DOM.savingsSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
  }, 1500);
}

/**
 * Display route comparison cards
 */
function displayRouteResults(routes) {
  const container = DOM.routeResults;
  container.innerHTML = '';
  
  // Create cards for each route type
  const routeTypes = ['fastest', 'shortest', 'eco'];
  
  routeTypes.forEach((type, index) => {
    const route = routes[type];
    const isEco = type === 'eco';
    const savings = {
      fuel: routes.fastest.fuel - route.fuel,
      time: route.time - routes.fastest.time,
      cost: routes.fastest.cost - route.cost
    };
    
    const card = document.createElement('div');
    card.className = `route-card ${isEco ? 'active' : ''} animate-slide-up`;
    card.style.animationDelay = `${index * 100}ms`;
    
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="font-medium ${isEco ? 'text-eco-300' : 'text-gray-300'} flex items-center gap-2">
          ${isEco ? '<i data-lucide="leaf" class="w-4 h-4"></i>' : ''}
          ${route.type}
        </span>
        <span class="text-sm ${isEco ? 'text-eco-400 font-semibold' : 'text-gray-500'}">${route.time} min</span>
      </div>
      
      <div class="h-2 bg-dark-800 rounded-full overflow-hidden mb-3">
        <div class="progress-fill" style="width: ${isEco ? '85%' : '100%'}; ${!isEco ? 'background: #6b7280;' : ''}"></div>
      </div>
      
      <div class="grid grid-cols-3 gap-4 mt-4">
        <div class="text-center">
          <div class="text-lg font-bold ${isEco ? 'text-eco-400' : 'text-gray-400'}">${route.fuel.toFixed(1)}L</div>
          <div class="text-xs text-gray-500">Fuel</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold ${isEco ? 'text-eco-400' : 'text-gray-400'}">$${route.cost.toFixed(2)}</div>
          <div class="text-xs text-gray-500">Cost</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold ${isEco ? 'text-eco-400' : 'text-gray-400'}">${route.co2.toFixed(1)}kg</div>
          <div class="text-xs text-gray-500">CO₂</div>
        </div>
      </div>
      
      ${isEco ? `
        <div class="mt-4 pt-4 border-t border-eco-500/30 flex items-center justify-between text-sm">
          <span class="text-eco-300 font-medium">Save ${savings.fuel.toFixed(1)}L (${Math.round((savings.fuel/routes.fastest.fuel)*100)}%)</span>
          <span class="text-eco-300 font-medium">+${Math.abs(savings.time)} min tradeoff</span>
        </div>
      ` : ''}
    `;
    
    container.appendChild(card);
  });
  
  // Re-initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Display annual savings projection
 */
function displaySavingsSummary(routes, vehicle) {
  const summary = DOM.savingsSummary;
  summary.classList.remove('hidden');
  summary.classList.add('animate-slide-up');
  
  // Calculate annual projections (assuming 2 trips per day, 250 work days)
  const tripsPerYear = 500;
  const annualSavings = {
    fuel: (routes.fastest.fuel - routes.eco.fuel) * tripsPerYear,
    cost: (routes.fastest.cost - routes.eco.cost) * tripsPerYear,
    co2: (routes.fastest.co2 - routes.eco.co2) * tripsPerYear
  };
  
  // Animate the counters
  setTimeout(() => {
    animateCounter(document.getElementById('annual-fuel'), 0, Math.round(annualSavings.fuel), 1500);
    animateCounter(document.getElementById('annual-cost'), 0, Math.round(annualSavings.cost), 1500);
    animateCounter(document.getElementById('annual-co2'), 0, Math.round(annualSavings.co2), 1500);
  }, 300);
}

// ============================================
// CHARTS & VISUALIZATIONS
// ============================================

/**
 * Create SVG route visualization
 */
function createRouteVisualization(containerId, routeData) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 400 200');
  svg.classList.add('w-full', 'h-auto');
  
  // Create path based on route type
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const isEco = routeData.type === 'eco';
  
  // Different path curves for different routes
  const d = isEco 
    ? 'M 50 150 Q 150 50 200 100 T 350 50' // Smoother curve for eco
    : 'M 50 150 L 150 140 L 250 60 L 350 50'; // Direct for fastest
    
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', isEco ? '#22c55e' : '#6b7280');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('stroke-linecap', 'round');
  path.classList.add('route-line');
  
  // Add start and end nodes
  const startNode = createRouteNode(50, 150, 'start');
  const endNode = createRouteNode(350, 50, 'end');
  
  svg.appendChild(path);
  svg.appendChild(startNode);
  svg.appendChild(endNode);
  
  container.appendChild(svg);
}

/**
 * Create SVG node for route point
 */
function createRouteNode(x, y, type) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  circle.setAttribute('r', '6');
  circle.classList.add('route-node');
  
  if (type === 'start') {
    circle.setAttribute('fill', '#3b82f6');
  } else {
    circle.setAttribute('fill', '#22c55e');
  }
  
  return circle;
}

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

/**
 * Load and display trip history
 */
function loadTripHistory() {
  const historyContainer = document.getElementById('trip-history');
  if (!historyContainer) return;
  
  const trips = AppState.savedTrips.slice(0, 5); // Last 5 trips
  
  if (trips.length === 0) {
    historyContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No trips yet. Start optimizing!</p>';
    return;
  }
  
  historyContainer.innerHTML = trips.map(trip => `
    <div class="glass-card p-4 mb-4 flex items-center justify-between animate-slide-up">
      <div>
        <div class="font-medium text-white">${trip.start} → ${trip.end}</div>
        <div class="text-sm text-gray-500">${new Date(trip.date).toLocaleDateString()} • ${trip.vehicle}</div>
      </div>
      <div class="text-right">
        <div class="text-eco-400 font-bold">-${trip.savings.fuel.toFixed(2)}L</div>
        <div class="text-xs text-gray-500">$${trip.savings.cost.toFixed(2)} saved</div>
      </div>
    </div>
  `).join('');
}

/**
 * Calculate total user statistics
 */
function calculateUserStats() {
  const trips = AppState.savedTrips;
  
  if (trips.length === 0) return null;
  
  return trips.reduce((acc, trip) => ({
    totalTrips: acc.totalTrips + 1,
    totalFuelSaved: acc.totalFuelSaved + trip.savings.fuel,
    totalCostSaved: acc.totalCostSaved + trip.savings.cost,
    totalCo2Saved: acc.totalCo2Saved + trip.savings.co2
  }), {
    totalTrips: 0,
    totalFuelSaved: 0,
    totalCostSaved: 0,
    totalCo2Saved: 0
  });
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

/**
 * Initialize all functionality
 */
function init() {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Initialize scroll animations
  initScrollReveal();
  
  // Initialize parallax
  initParallax();
  
  // Initialize navbar
  initNavbarScroll();
  
  // Initialize vehicle selection
  if (DOM.vehicleBtns.length > 0) {
    selectVehicle(AppState.userPreferences.defaultVehicle);
  }
  
  // Initialize input animations
  initInputAnimations();
  
  // Load dashboard data if on dashboard page
  loadTripHistory();
  
  // Console welcome message
  console.log('%c🌱 Smart Route Optimizer', 'color: #22c55e; font-size: 20px; font-weight: bold;');
  console.log('%cBuilt with ❤️ by Gen Coders - Hackathon 2026', 'color: #6b7280;');
}

/**
 * Input field animations
 */
function initInputAnimations() {
  const inputs = document.querySelectorAll('.input-field');
  
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('input-focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('input-focused');
    });
  });
}

/**
 * Keyboard navigation
 */
document.addEventListener('keydown', (e) => {
  // Escape to close mobile menu
  if (e.key === 'Escape') {
    DOM.mobileMenu.classList.add('hidden');
  }
  
  // Enter to calculate route if in input
  if (e.key === 'Enter' && (e.target === DOM.startPoint || e.target === DOM.endPoint)) {
    calculateRoute();
  }
});

/**
 * Handle visibility change (pause animations when tab hidden)
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    document.body.classList.add('tab-inactive');
  } else {
    document.body.classList.remove('tab-inactive');
  }
});

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================

// Make functions available globally for HTML onclick attributes
window.toggleMobileMenu = toggleMobileMenu;
window.selectVehicle = selectVehicle;
window.calculateRoute = calculateRoute;
window.scrollToSection = scrollToSection;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-initialize after dynamic content loads
window.reinitIcons = () => {
  if (window.lucide) {
    lucide.createIcons();
  }
};

// ============================================
// SERVICE WORKER REGISTRATION (PWA Support)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}
