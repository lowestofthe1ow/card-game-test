$(document).ready(function() {
  $("#demo").click(
    function(){
      password();
    }
  );

  function password() {
    let pw = prompt("Enter password");
    if (pw == "password1") {
      window.open("demo.html","_self")
    };
  }
});
