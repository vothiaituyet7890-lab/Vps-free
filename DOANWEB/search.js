// Filter courts based on search input
function filterCourts() {
  const searchInput = document.getElementById('searchInput').value.toLowerCase();
  const courtCards = document.querySelectorAll('.court-type-card');
  
  courtCards.forEach(card => {
    const courtName = card.querySelector('h3').textContent.toLowerCase();
    const courtDescription = card.querySelector('.court-description').textContent.toLowerCase();
    
    if (courtName.includes(searchInput) || courtDescription.includes(searchInput)) {
      card.style.display = 'block';
      // Add animation
      card.style.animation = 'fadeIn 0.5s ease';
    } else {
      card.style.display = 'none';
    }
  });
}

// Navigate to booking page with court type
function goToBooking(courtType) {
  // Save selected court type to localStorage
  localStorage.setItem('selectedCourtType', courtType);
  
  // Redirect to booking page
  window.location.href = 'danh-sach-san.html';
}

// Add CSS animation for fadeIn
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
