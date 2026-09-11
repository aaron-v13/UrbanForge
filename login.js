const togglePassword = document.getElementById("togglePassword");
const password = document.querySelector(".input-box2 input");

togglePassword.addEventListener("click", function(){
    if (password.type === "password") {
        password.type = "text";

        togglePassword.classList.remove("fa-eye");
        togglePassword.classList.add("fa-eye-slash");

    } else{
        password.type = "password"

        togglePassword.classList.remove("fa-eye-slash");
        togglePassword.classList.add("fa-eye");
    }
})