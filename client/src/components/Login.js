import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { connect } from "react-redux";

import { history } from "../router/router";

import { toast } from "react-toastify";

import Loader from "./Loader";

const LoginForm = ({ putToken }) => {
	const [isLoading, setIsLoading] = useState(false);

	const sendFormData = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		const username = document.getElementById("username_field").value;
		const password = document.getElementById("password_field").value;

		try {
			const res = await axios({
				url: "/api/v1/users/login",
				method: "POST",
				data: {
					username,
					password,
				},
			});
			toast.success("Logged in successfully!", {
				autoClose: 2000,
			});
			console.log(res.data.data.user);
			putToken(res.data.data.user);
		} catch (err) {
			setIsLoading(false);
			toast.error(`Error: ${err.response.data.data.error.message}`);
		}
	};

	return (
		<div className="login-page">
			<div className="login-form-container">
				<h2>Finstagram</h2>
				<form onSubmit={sendFormData} className="login-form">
					<input
						type="text"
						name="username"
						required={true}
						placeholder="username"
						id="username_field"
					></input>
					<input
						type="password"
						name="password"
						placeholder="********"
						id="password_field"
						required={true}
					></input>
					<button
						type="submit"
						className="login-form__submit"
						disabled={isLoading}
					>
						{!isLoading ? <p>Submit</p> : <Loader />}
					</button>
				</form>
				<p>
					No account? <Link to="/signup">Sign up</Link>
				</p>
			</div>
		</div>
	);
};

const mapDispatchToProps = (dispatch) => ({
	putToken: (user) => dispatch({ type: "PUT_TOKEN", user }),
});

export default connect(null, mapDispatchToProps)(LoginForm);
