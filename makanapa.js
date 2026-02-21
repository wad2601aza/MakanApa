        /**
         * CONFIGURATION
         * Set USE_PHP_BACKEND to true if you are hosting the PHP files.
         * Set to false to use the Local Simulation for testing in Canvas.
         */
        const USE_PHP_BACKEND = true; 
        const API_URL = 'api.php'; 

        // State
        let currentRole = 'buyer'; // 'buyer' or 'seller'
        let currentRequestId = null;
        let pollingInterval = null;
        let auctionContainer = null;
        let userHabit = null;


        // UI Elements
        const savedSellerName = localStorage.getItem('seller_name');
        const buyerView = document.getElementById('buyer-view');
        const sellerView = document.getElementById('seller-view');
        const chatArea = document.getElementById('chat-area');
        const sellerRequestsList = document.getElementById('seller-requests');
        const roleBtn = document.getElementById('toggle-role-btn');
        const userInput = document.getElementById('user-input');
        const historyBtn = document.getElementById('history-btn');
        const balanceCard = document.getElementById('balance-card');

        
        // --- CORE LOGIC ---
        async function chooseAddress() {
            if (!navigator.geolocation) {
                alert("Geolocation not supported");
                return;
            }

            navigator.geolocation.getCurrentPosition(async pos => {

                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                try {

                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
                    );

                    const data = await res.json();

                    // ✅ FULL address like street, district, city, province, country
                    const fullAddress = data.display_name;

                    document.getElementById('order-address').value = fullAddress;

                    localStorage.setItem('buyer_address', fullAddress);

                    alert("Full address selected 📍");

                } catch (err) {

                    console.error(err);

                    alert("Failed to get address");

                }

            }, () => {

                alert("Location permission denied");

            });
        }


        async function submitTopup() {

            const amount = document.getElementById("topup-amount").value;

            const response = await fetch("api.php?action=set_balance", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `user_id=1&amount=${amount}`
            });

            const data = await response.json();

            if (data.success) {
                closeTopupModal();
                await loadBalance(); // 🔥 INI WAJIB
            } else {
                alert(data.error);
            }
        }
        function openOrderModal() {
            const saved = localStorage.getItem('buyer_address');

            if (saved) {
                document.getElementById('order-address').value = saved;
            }

            document.getElementById('order-modal').classList.add('show');
        }

        function closeModal() {
            const modal = document.getElementById('order-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // 1. Send Request (Buyer)
        async function sendRequest(text) {
            addMessage(text, 'user');
            addMessage("Waiting for sellers to offer their best price... ⏳", 'bot');
            
            const buyerName =
                localStorage.getItem('buyer_name')
                || document.getElementById('buyer-name')?.value
                || "Anonymous";
            
            if (USE_PHP_BACKEND) {
                try {
                    const formData = new FormData();
                    formData.append('action', 'create_request');
                    formData.append('description', text);
                    formData.append('buyer_name', buyerName); 

                    const res = await fetch(API_URL, { method: 'POST', body: formData });
                    const data = await res.json();
                    currentRequestId = data.request_id;
                    startPollingOffers();
                } catch(e) { console.error(e); }
            } else {
                // Mock Backend: Store request in "Cloud" (LocalStorage)
                currentRequestId = Date.now();
                const requests = JSON.parse(localStorage.getItem('mock_requests') || '[]');
                requests.push({ id: currentRequestId, text: text, timestamp: Date.now() });
                localStorage.setItem('mock_requests', JSON.stringify(requests));
                startPollingOffers(); // Start checking for offers
            }
        }

        async function loadBalance() {
            try {
                const response = await fetch("api.php?action=get_balance&user_id=1");
                const data = await response.json();

                console.log("Balance data:", data);

                if (data && data.balance !== undefined) {
                    document.getElementById("user-balance").innerText =
                        parseInt(data.balance).toLocaleString("id-ID");
                }
            } catch (error) {
                console.error("Failed load balance:", error);
            }
        }
        
        async function renderHabits() {
            try {
                const res = await fetch(`${API_URL}?action=get_habits`);
                if (!res.ok) throw new Error("Bad response");

                const habits = await res.json();

                const box = document.getElementById('habit-box');
                const tags = document.getElementById('habit-tags');

                // No habit data → hide
                if (
                    !habits ||
                    (!habits.avg_price && !habits.last_food && !habits.total_orders)
                ) {
                    box.classList.add('hidden');
                    return;
                }

                // Show box
                box.classList.remove('hidden');
                tags.innerHTML = '';

                // 💰 Average price habit
                if (habits.avg_price) {
                    tags.innerHTML += `
                        <span class="bg-orange-500 text-white text-sm px-3 py-1 rounded-full font-bold">
                            💰 ~Rp ${Number(habits.avg_price).toLocaleString()}
                        </span>
                    `;
                }

                // 🍜 Last chosen food
                if (habits.last_food) {
                    tags.innerHTML += `
                        <span class="bg-white border border-orange-300 text-orange-700
                            text-sm px-3 py-1 rounded-full font-semibold">
                            🍜 ${habits.last_food}
                        </span>
                    `;
                }

            } catch (e) {
                console.error("Habit load failed:", e.message);
            }
        }


        // 2. Poll for Offers (Buyer)
        function startPollingOffers() {
            if (pollingInterval) clearInterval(pollingInterval);
            pollingInterval = setInterval(async () => {
                let offers = [];
                
                if (USE_PHP_BACKEND) {
                    try {
                        const res = await fetch(`${API_URL}?action=get_offers&request_id=${currentRequestId}`);
                        offers = await res.json();
                    } catch(e) {}
                } else {
                    // Mock Backend: Check LocalStorage for offers linked to this request
                    const allOffers = JSON.parse(localStorage.getItem('mock_offers') || '[]');
                    offers = allOffers.filter(o => o.requestId == currentRequestId);
                }

                if (offers.length > 0) {
                    renderAuction(offers);
                   
                }
            }, 2000); // Check every 2 seconds
        }

        async function loadUserHabit() {
            try {
                const res = await fetch(`${API_URL}?action=get_habits`);
                if (!res.ok) throw new Error("Bad response");

                const text = await res.text();
                if (!text) throw new Error("Empty response");

                userHabit = JSON.parse(text);
                console.log("Loaded habit:", userHabit);
            } catch (e) {
                console.error("Failed to load habit:", e.message);
                userHabit = null;
            }
        }


        // 3. Render Auction Cards (Buyer)
        function renderAuction(offers) {
            const avg = userHabit && userHabit.avg_price
                ? Number(userHabit.avg_price)
                : null;
            const habits = userHabit || {};
            const cheapestPrice = Math.min(...offers.map(o => Number(o.price)));
            const cheapestBias =
                userHabit && userHabit.total_orders
                    ? userHabit.cheapest_count / userHabit.total_orders
                    : 1; // default = cheapest lover

            function isLikely(price) {
                if (!avg) return false;
                return Math.abs(price - avg) <= avg * 0.2;
            }

                // Smart sorting
                offers.sort((a, b) => {
                    if (!habits.avg_price) {
                        return a.price - b.price;
                    }

                    return Math.abs(a.price - habits.avg_price)
                        - Math.abs(b.price - habits.avg_price);
                });

            const cheapest = Math.min(...offers.map(o => parseInt(o.price)));

            // Create auction container ONCE
            if (!auctionContainer) {
                auctionContainer = document.createElement('div');
                auctionContainer.className = 'bot-msg message-bubble w-full';
                auctionContainer.innerHTML = `
                    <div class="font-bold text-orange-600 mb-2">
                        🔥 LIVE OFFERS
                    </div>
                    <div id="auction-list" class="flex flex-col gap-2"></div>
                `;
                chatArea.appendChild(auctionContainer);
            }

            const list = auctionContainer.querySelector('#auction-list');
            list.innerHTML = ''; // 🔥 CLEAR OLD OFFERS

            offers.forEach((offer, index) => {
                const likely = isLikely(parseInt(offer.price));
                const price = Number(offer.price);
                const isBest = price === cheapestPrice;

                // 🎯 POINT SYSTEM (HABIT-BASED)
                let points = 1;

                if (cheapestBias > 0.6) {
                    // Buyer usually chooses cheapest
                    if (price === cheapestPrice) {
                        points = 10;
                    } else {
                        points = 1;
                    }
                } else {
                    // Buyer flexible
                    if (index === 0) points = 5;
                    else if (index === 1) points = 3;
                    else if (index === 2) points = 2;
                }

                const badgeColor =
                    points >= 8
                        ? 'text-green-600 bg-green-50'
                        : 'text-orange-600 bg-orange-50';

                const card = document.createElement('div');
                card.className = `
                    auction-card p-3 rounded-xl flex justify-between items-center
                    ${isBest ? 'border-2 border-green-500 bg-green-50' : ''}
                    ${likely ? 'border-2 border-orange-500 bg-orange-100' : ''}
                `;

                card.innerHTML = `
                <div>
                    <div class="text-[10px] text-gray-500 font-bold uppercase">
                    ${offer.seller_name}
                    </div>

                    <div class="font-bold text-gray-800 flex items-center gap-2">
                    ${offer.food_name}
                    ${isBest ? '<span class="text-green-600 text-xs font-bold">🏆 BEST PRICE</span>' : ''}
                    ${likely ? '<span class="text-orange-600 text-xs font-bold">⭐ RECOMMENDED</span>' : ''}
                    </div>

                    <div class="text-[10px] ${badgeColor} inline-block px-1 rounded font-bold mt-1">
                    ⭐ Score: ${points} pts
                    ${points >= 8 ? '🔥 BEST MATCH' : ''}
                    </div>
                </div>

                <div class="text-right">
                    <div class="text-lg font-bold text-orange-600">
                    Rp ${parseInt(offer.price).toLocaleString()}
                    </div>

                    <button

                    onclick="openOrder(
                        '${offer.seller_name}',
                        '${offer.food_name}',
                        '${offer.price}',
                        '${offer.contact}'
                    )"
                    class="bg-orange-500 text-white text-xs px-3 py-1.5
                        rounded-lg mt-1 font-bold hover:bg-orange-600">
                    Choose
                    </button>       
                </div>
                `;

                list.appendChild(card);
            });

            chatArea.scrollTop = chatArea.scrollHeight;
        }


        // 4. Load Requests (Seller)
        async function loadSellerRequests() {
            let requests = [];
            if (USE_PHP_BACKEND) {
                try {
                    const res = await fetch(`${API_URL}?action=get_requests`);
                    requests = await res.json();
                } catch(e) {}
            } else {
                requests = JSON.parse(localStorage.getItem('mock_requests') || '[]');
                // Filter out requests that already have offers (optional logic)
            }

            sellerRequestsList.innerHTML = '';
            if (requests.length === 0) {
                sellerRequestsList.innerHTML = '<div class="text-center text-gray-400 mt-10">No active requests</div>';
                return;
            }

            requests.forEach(req => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100';
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded">NEW REQUEST</span>
                            <p class="font-bold text-gray-800 text-lg mt-1">"${req.description}"</p>
                        </div>
                        <div class="text-xs text-gray-400">${new Date(req.created_at).toLocaleTimeString()}</div>
                    </div>
                    
                    <!-- Offer Form -->
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                        <input type="text" id="offer-name-${req.id}" placeholder="Dish Name (e.g. Nasi Goreng Hijau)" class="w-full mb-2 p-2 rounded border focus:border-orange-500 outline-none">
                        <input type="text" id="offer-seller-${req.id}" value="${savedSellerName || ''}" placeholder="Your Shop Name (e.g. Warunk Mak Siti)"  class="w-full mb-2 p-2 rounded border"/>
                        <div class="flex gap-2 mb-2">
                            <input type="number" id="offer-price-${req.id}" placeholder="Price (Rp)" class="w-1/2 p-2 rounded border focus:border-orange-500 outline-none">
                            <input type="text" id="offer-contact-${req.id}" placeholder="WhatsApp (e.g. 62812...)" class="w-1/2 p-2 rounded border focus:border-orange-500 outline-none">
                        </div>
                        <button onclick="submitOffer(${req.id})" class="w-full bg-orange-500 text-white font-bold py-2 rounded hover:bg-orange-600 transition">
                            Submit Offer
                        </button>
                    </div>
                `;
                sellerRequestsList.appendChild(card);
            });
        }

        // 5. Submit Offer (Seller)
        async function submitOffer(reqId) {
            const foodName =
                document.getElementById(`offer-name-${reqId}`).value;
            const price =
                document.getElementById(`offer-price-${reqId}`).value;
            const contact =
                document.getElementById(`offer-contact-${reqId}`).value;
            const sellerName =
                document.getElementById(`offer-seller-${reqId}`).value;

            // 1️⃣ Validate first
            if (!sellerName) return alert("Please enter your shop name");
            if (!foodName || !price || !contact)
                return alert("Please fill all fields");

            // 2️⃣ Save seller name AFTER validation ✅
            localStorage.setItem('seller_name', sellerName);

            const offerData = {
                request_id: reqId,
                seller_name: sellerName,
                food_name: foodName,
                price: price,
                contact: contact
            };

            if (USE_PHP_BACKEND) {
                const formData = new FormData();
                formData.append('action', 'add_offer');
                for (const key in offerData) {
                    formData.append(key, offerData[key]);
                }
                await fetch(API_URL, { method: 'POST', body: formData });
            } else {
                const offers =
                    JSON.parse(localStorage.getItem('mock_offers') || '[]');
                offers.push({ ...offerData, requestId: reqId });
                localStorage.setItem('mock_offers', JSON.stringify(offers));
            }

            alert("Offer sent to customer!");
            loadSellerRequests();
        }


        // --- UTILS ---

        function addMessage(text, type) {
            const div = document.createElement('div');
            div.className = `${type === 'user' ? 'user-msg' : 'bot-msg'} message-bubble`;
            div.innerText = text;
            chatArea.appendChild(div);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        fetch(`${API_URL}?action=get_habits`)
            .then(res => res.json())
            .then(habits => {
                const container = document.getElementById('habit-summary');
                if (!container) return;

                container.innerHTML = `
                    <div class="text-orange-500 font-bold mb-2">YOUR HABITS</div>
                    <div class="flex gap-2 flex-wrap">
                        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                            💰 ~Rp ${Math.round(habits.avg_price).toLocaleString()}
                        </span>
                        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                            🍽 ${habits.last_food}
                        </span>
                    </div>
                `;
            });
    

         function saveUserHabit(food, price, isCheapest) {
            const fd = new FormData();
                fd.append('action', 'save_habit');
                fd.append('food_name', food);
                fd.append('price', price);
                fd.append('is_cheapest', isCheapest);

            fetch(API_URL, { method: 'POST', body: fd });
        }

        
        function openHistoryModal() {
            const modal = document.getElementById("history-modal");
            modal.classList.add("active"); // Matches your CSS #history-modal.active
            document.body.classList.add("modal-open"); // Prevents background scroll
            
            loadOrderHistory(); 
        }

        function closeHistoryModal() {
            const modal = document.getElementById("history-modal");
            modal.classList.remove("active");
            document.body.classList.remove("modal-open");
        }

        // Modal Logic
        
        function openOrder (seller, food, price, contact) {

            const modal = document.getElementById('order-modal');

            if (!modal) {
                console.error("Modal not found");
                return;
            }

            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Fill info
            document.getElementById('modal-seller-name').innerText = seller;
            document.getElementById('modal-food-name').innerText = food;
            document.getElementById('modal-price').innerText =
                "Rp " + Number(price).toLocaleString();

            // Load saved address
            const savedAddress = localStorage.getItem('buyer_address');
                if (savedAddress) {
                    document.getElementById('order-address').value = savedAddress;
                }

            // Load saved name
            const savedName = localStorage.getItem('buyer_name');
                if (savedName) {
                    document.getElementById('buyer-name').value = savedName;
                }

                // Save when changed
                document.getElementById('buyer-name').onchange = e => {
                    localStorage.setItem('buyer_name', e.target.value);
                };


            const qtyInput = document.getElementById('order-qty');
            const totalBox = document.getElementById('order-total');

            function updateTotal() {
                const qty = Number(qtyInput.value) || 1;
                const total = qty * Number(price);
                totalBox.innerText = "Total: Rp " + total.toLocaleString();
            }

            updateTotal();
            qtyInput.oninput = updateTotal;

            document.getElementById('order-address').onchange = e => {
                localStorage.setItem('buyer_address', e.target.value);
            };

            // Normalize phone
            contact = contact.replace(/\D/g, '');
            if (contact.startsWith('0')) {
                contact = '62' + contact.slice(1);
            }

                document.getElementById('whatsapp-link').onclick = async () => {
                    const qty = 
                        Number(qtyInput.value);

                    const address =
                        document.getElementById('order-address').value;

                    const buyerName =
                        document.getElementById('buyer-name').value;

                    const total = qty * Number(price);

                    const fd = new FormData();
                        fd.append('action', 'create_order');
                        fd.append('user_id', 1);

                        fd.append('request_id', currentRequestId);

                        fd.append('buyer_name', buyerName);
                        fd.append('buyer_address', address);

                        fd.append('seller_name', seller);
                        fd.append('food_name', food);

                        fd.append('price', price);
                        fd.append('quantity', qty);
                        fd.append('total', total);

                        fd.append('contact', contact);

                        await fetch(API_URL, {
                            method: 'POST',
                            body: fd
                        });

                    const msg = `
                Hi ${seller},
                I want to order:

                Name: ${buyerName}
                Food: ${food}
                Quantity: ${qty}
                Total: Rp ${total.toLocaleString()}
                Address: ${address}
                    `;

                    const waLink =
                        `https://wa.me/${contact}?text=${encodeURIComponent(msg)}`;

                    window.open(waLink, '_blank');
                };
        };


        async function loadOrderHistory() {
            const list = document.getElementById("history-list");
            const totalSpendEl = document.getElementById("total-spend");
            
            try {
                const res = await fetch(`${API_URL}?action=get_combined_history&user_id=1`);
                const data = await res.json();

                let totalSpent = 0;
                list.innerHTML = "";

                data.forEach(item => {
                    const isPayment = item.type === 'payment';
                    
                    // Only add to Total Spending if it's a 'payment' (order)
                    if (isPayment) {
                        totalSpent += parseInt(item.amount);
                    }

                    const card = document.createElement("div");
                    card.className = "flex justify-between items-center p-4 border-b border-gray-50 bg-white mb-2 rounded-lg shadow-sm";
                    card.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center ${isPayment ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}">
                                <i class="fa-solid ${isPayment ? 'fa-utensils' : 'fa-wallet'}"></i>
                            </div>
                            <div>
                                <div class="font-bold text-sm text-gray-800">${item.title}</div>
                                <div class="text-[10px] text-gray-500 uppercase">${item.details}</div>
                            </div>
                        </div>
                        <div class="font-bold ${isPayment ? 'text-red-500' : 'text-green-600'}">
                            ${isPayment ? '-' : '+'}Rp ${parseInt(item.amount).toLocaleString()}
                        </div>
                    `;
                    list.appendChild(card);
                });

                // Update the "Total Spend" text in the UI
                if (totalSpendEl) {
                    totalSpendEl.innerText = `Rp ${totalSpent.toLocaleString()}`;
                }
            } catch (e) {
                console.error("History error:", e);
            }
        }

        // Init
        roleBtn.onclick = () => {

            if (currentRole === 'buyer') {

                currentRole = 'seller';

                buyerView.classList.add('hidden');
                sellerView.classList.remove('hidden');

                roleBtn.innerText = "Switch to Buyer";

                // 🔥 Hide buyer-only UI
                if (historyBtn) historyBtn.classList.add('hidden');
                if (balanceCard) balanceCard.classList.add('hidden');

                loadSellerRequests();

            } else {

                currentRole = 'buyer';

                sellerView.classList.add('hidden');
                buyerView.classList.remove('hidden');

                roleBtn.innerText = "Switch to Seller";

                // 🔥 Show buyer-only UI
                if (historyBtn) historyBtn.classList.remove('hidden');
                if (balanceCard) balanceCard.classList.remove('hidden');
            }
        };
        

        // ============================
        // TOP UP MODAL FUNCTIONS
        // ============================

        function openTopupModal() {
            const modal = document.getElementById("topup-modal");
            modal.classList.remove("hidden");
            modal.classList.add("flex");
        }

        function closeTopupModal() {
            const modal = document.getElementById("topup-modal");
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }

        
        
        loadBalance();
        loadUserHabit();
        renderHabits();

        document.getElementById('send-btn').onclick = () => {
            const val = userInput.value;
            if(val.trim()) { userInput.value = ''; sendRequest(val); }
        }
        userInput.onkeypress = (e) => { if(e.key === 'Enter') document.getElementById('send-btn').click(); }
        
        addMessage("Tell me what you're craving and watch sellers compete to give you the best offer!", "bot");



        window.openHistoryModal = openHistoryModal;
        window.closeHistoryModal = closeHistoryModal;
        window.openOrder = openOrder;
        window.closeModal = closeModal;
        window.chooseAddress = chooseAddress;
        window.openTopupModal = openTopupModal;
        window.closeTopupModal = closeTopupModal;

