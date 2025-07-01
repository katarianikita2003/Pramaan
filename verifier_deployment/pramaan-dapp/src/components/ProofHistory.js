import React, { useEffect, useState } from "react";

const ProofHistory = ({ email }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/proof-history/${email}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch proof history.");
                }

                const data = await response.json();
                setHistory(data);
            } catch (error) {
                setError("Error fetching proof history. Please try again.");
                console.error("❌ Error fetching proof history:", error);
            } finally {
                setLoading(false);
            }
        };

        if (email) fetchHistory();
    }, [email]);

    return (
        <div className="proof-history-container">
            <h2>Proof History</h2>

            {loading ? (
                <p>Loading proof history...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : history.length === 0 ? (
                <p className="no-data">No proof history available.</p>
            ) : (
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Date & Time</th>
                            <th>Verification Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((entry, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{new Date(entry.date).toLocaleString()}</td>
                                <td className={entry.status === "Success" ? "success" : "failure"}>
                                    {entry.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ProofHistory;
